var http  = require('http'),
    https = require('https'),
    sys   = require('sys'),
    fs    = require('fs'),
    util  = require('util'),
    path  = require('path'),
    url   = require('url');

var check    = require('validator').check,
    sanitize = require('validator').sanitize;

var RequestProcessor = require('./request-processor');

var config = {}, 
    defaults = {
      port:8000,
      cache:{
        ttl:"1h",
        disk:false,
        redis:{
          host:"127.0.0.1",
          port:6379
        }
      }
    },
    cache = {
      enabled:false
    };



var setDefaults = function(to,from){
  var from = from || defaults;
  for (key in from){
    if (!to.hasOwnProperty(key)){
      to[key] = from[key];
    }
    if (typeof to[key] == 'object'){
      setDefaults(to[key],from[key]);
    }
  }
};

var onRequest = function(request, response){
  
  request.fail = function(status,reason,msg,exception){
    _respond(response,status,reason,msg,'text-plain',function(){
      if(exception) console.log(exception);
      console.log("Rejecting request to " + request.uri + ' : ' + msg);
    });};
  request.reply  = function(content_type,body){
    _respond(response,200,"OK",body,content_type);
  };
  
  var endpointDone = function(content_type,body){_endpointDone(request,content_type,body);};

  //break request URI at the slash between the endpoint name and a URI protocol.
  //(if there's a URI after the endpoint, the slash between is removed here)
  var uri_parts = request.headers['tache-endpoint']
    ?[request.headers['tache-endpoint'], request.url]
    :request.url.split(/\/(?=\w+:\/\/)/,2);
  
  /* uri_parts will be one of:
    ["", target_uri]
    [endpoint_name, target_uri]
    [endpoint_name]
    [endpoint_name/]
  */
  
  var endpoint_name = uri_parts[0],
      target_url    = uri_parts[1];
  
  //TODO: this cleaning of urls etc needs a LOT of work
  endpoint_name = endpoint_name.replace(/\.+/,'.');   //strip any multiple instances of dots, prevent directory traversal
  target_url = target_url.replace(/^\//,'');    //can end up with a leading slash if endpoint is specified in header
  console.log(util.inspect([endpoint_name, target_url]));
  
  //TODO: if the endpoint name has a slash at the end, treat it sort of like
  //a HEAD request to the endpoint and return meta info
  try {
    check(endpoint_name).regex(/(\w\.)+\w+/);
  } catch (e) {
    return request.fail(501,
      "Not Supported",
      "Invalid endpoint name form",e);
  }
  
  //if no URI specified (could happen with direct requests to root and an endpoint header)
  //TODO: node-validator only accepts http, https, ftp. Do i need to support more?
  try {
    check(target_url).isUrl();
  } catch (e) {
    return request.fail(404,
      "Not Found",
      "Target URL not specified, or invalid",e);
  }
  
  if( cache.enabled && cache.has(endpoint_name, target_url) )
  {
    cache.get(endpoint_name, target_url, function(cacheItem){
      if ( !cacheItem.expired ){
        //reply to client with content
      }
      else
      {
        cache.remove(endpoint_name, target_url);
        //run the transformation for this request.
        processor = new RequestProcessor();
        processor.init(endpoint_name, target_url);
      }
    });
  }
  
  var processor = new RequestProcessor();
  processor.init(endpoint_name, target_url);
  
  processor.on("complete", function(content_type, body){
    //reply to client with content
    request.reply(content_type, body);
    
    if(cache.enabled){
      cache.store(endpoint_name,
        target_url,
        endpoint.ttl || config.ttl,
        content_type,
        body);
    }
  });
  
}

var _respond = function(response, status, reasonPhrase, content_type, body, after){
  response.writeHead(status, reasonPhrase || "", {
    'Content-Length': body.length,
    'Content-Type': content_type });
  response.write(body);
  response.end();
  if (after) after();
}

var _endpointDone = function(request, content_type, resource) {
  console.log("Finished processing request to " + request.url);
  request.reply(content_type, resource);
};

exports.init = function(dir){
  
  if (dir) require.paths.unshift(dir);
  //Read config
  var config_path =  process.argv[2] || 'tache-config.js';
  if(!fs.statSync(config_path).isFile())
  {
    //not actually much point showing a real message here; statSync will blow up
    //if file not found.
    sys.puts("Unable to start Tache.io: config file not found.");
    //Cleanest way to kill a node app? Send signal or something?
    return;
  }
  
  console.log('Using config file '+ path.resolve(path.normalize(config_path)) + ':');
  config = JSON.parse(fs.readFileSync(config_path, "utf8"));
  
  //TOOD: Nice idea: watch config file for changes and dynamically reload?
  
  //establish defaults:
  setDefaults(config);
  
  console.log("Full config is: " + util.inspect(config)+"\n");
  
  //use auth or not?
  //logging?
  //locations of endpoint code?
      //endpoint location path retrieved from env, or config file etc.
  
  //setup Redis connection
  
  //setup server
  
  http.createServer(onRequest)
  .listen(
    config.port,
    config.hostname,
    function(){
      sys.puts('Tache.io server running on '+ (config.hostname || '[INADDR_ANY]') + ':' + config.port );
  });
}
