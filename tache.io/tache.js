var http  = require('http'),
    https = require('https'),
    sys   = require('sys'),
    fs    = require('fs'),
    path  = require('path'),
    url   = require('url');

var check    = require('validator').check,
    sanitize = require('validator').sanitize;

var RequestProcessor = require('./request-processor'),
    Endpoint = exports.Endpoint = require('./endpoint'),
    util = require('./util');

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

var onRequest = function(request, response){
  
  //bind some functions in to context
  request.fail = function(status,reason,msg,exception){
    _respond(response,status,reason,'text-plain',msg+'\n',function(){
      if(exception) console.log(exception);
      console.log("Rejecting request to " + request.url + ' : ' + msg);
    });};
  request.reply  = function(content_type,body){
    _respond(response,200,"OK",body,content_type);
  };
  
  //break request URI at the slash between the endpoint name and a URI protocol.
  //(if there's a URI after the endpoint, the slash between is removed here)
  var uri_parts = request.url
    .split(/\/(?=\w+:\/\/)/,2);   //FIXME -- broken!
  
  /* uri_parts will be one of:
    ["", target_uri]
    [endpoint_name, target_uri]
    [endpoint_name]
    [endpoint_name/]
  */
  
  //TODO: improve input escaping
  var endpoint_name = sanitize(uri_parts[0] || request.headers['tache-endpoint'])
      .trim('^A-Za-z0-9')   //trim non-word chars from ends
      .replace(/\/+/,'/');  //remove multiple instances of slashes
  var target_url = sanitize(uri_parts[1])
      .ltrim('/')
  
  //TODO: if no url, treat requests like 
  //a HEAD request to the endpoint and return meta info
  try {
    check(endpoint_name).regex(/(?:\w[\/\.]){1,}\w+/); //ensure enpoint is of the form foo.bar, foo/bar, foo.bar/bar/foo etc
  } catch (e) {
    return request.fail(501, "Not Supported",
      "Invalid endpoint name form",e);
  }
  
  //if no URI specified (could happen with direct requests to root and an endpoint header)
  //TODO: node-validator only accepts http, https, ftp. Do i need to support more?
  try {
    check(target_url).isUrl();
  } catch (e) {
    return request.fail(404, "Not Found",
      "Target URL not specified, or invalid",e);
  }
  
  console.log('***' + endpoint_name + " | " + target_url + '***');
  
  //Bind in the actual processing trigger, appropriate errors etc
  var processRequest = function(){
    var processor = new RequestProcessor();

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

    processor.on("critical", function(err){
      return request.fail(err.status, err.reason, err.msg, err.thrown);
    });

    processor.init(endpoint_name, target_url);
  };
  
  if( cache.enabled && cache.has(endpoint_name, target_url) )
  {
    cache.get(endpoint_name, target_url, function(cacheItem){
      if ( !cacheItem.expired ){
        //reply to client with content
      }
      else
      {
        //remove from cache and continue as normal
        cache.remove(endpoint_name, target_url);
        processRequest();
      }
    });
  }
  else
  {
    processRequest();
  }
};

var _respond = function(response, status, reasonPhrase, content_type, body, after){
  response.writeHead(status, reasonPhrase || "", {
    'Content-Length': body.length,
    'Content-Type': content_type });
  response.write(body);
  response.end();
  if (after) after();
}

exports.init = function(config_path,listen){
  
  // flag to indicate whether the server should bind to a [host and] port.
  // 99% of the time this will be true -- the major exception is running tests,
  //where expresso does it for us.
  if (listen !== false) listen = true
  
  //Read config
  config_path = config_path || 'tache-config.js';
  
  config_path = path.resolve(path.normalize(config_path));
  
  if(!fs.statSync(config_path).isFile())
  {
    //not actually much point showing a real message here; statSync will blow up
    //if file not found.
    sys.puts("Unable to start Tache.io: config file not found.");
    //Cleanest way to kill a node app? Send signal or something?
    return;
  }
  
  console.log('Using config file '+ config_path + ':');
  config = JSON.parse(fs.readFileSync(config_path, "utf8"));
  
  //TOOD: Nice idea: watch config file for changes and dynamically reload?
  
  //establish defaults:
  util.merge(config, defaults);
  
  console.log("Full config is: " + util.inspect(config)+"\n");
  
  //use auth or not?
  //logging?
  //locations of endpoint code?
      //endpoint location path retrieved from env, or config file etc.
  
  //setup Redis connection
  
  //setup server
  
  var server = http.createServer(onRequest);
  if(listen){
    server.listen(
      config.port,
      config.hostname,
      function(){
        sys.puts('Tache.io server running on '+ (config.hostname || '[INADDR_ANY]') + ':' + config.port );
    });
  }
  
  return server;
}

