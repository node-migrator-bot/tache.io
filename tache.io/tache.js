var http  = require('http'),
    https = require('https'),
    sys   = require('sys'),
    fs    = require('fs'),
    util  = require('util'),
    path  = require('path'),
    url   = require('url');

var check = require('validator').check,
    sanitize = require('validator').sanitize;

var config = {};
var defaults = {
  port:8000,
  cache:{
    ttl:"1h",
    disk:false,
    redis:{
      host:"127.0.0.1",
      port:6379
    }
  }
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
  
  var fail = function(status,reason,msg){
    _respond(response,status,reason,msg,'text-plain',function(){
      console.log("Rejecting request to " + request.uri + ' : ' + msg);
    });
  };
  var reply = function(content_type,body){
    _respond(response,200,"OK",body,content_type);
  };
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
    return fail(501,
      "Not Supported",
      "Invalid endpoint name form");
  }
  
  //if no URI specified (could happen with direct requests to root and an endpoint header)
  //TODO: node-validator only accepts http, https, ftp. Do i need to support more?
  try {
    check(target_url).isUrl();
  } catch (e) {
    return fail(404,
      "Not Found",
      "No URL specified");
  }
  
  //TODO: check endpoint exists and load it (without killing server if it doesn't exist!)
  
  //got URL, so go fetch it
  //parse URL, then rebuild in the form the HTTP[S].get() expects
  var target = url.parse(target_url);
  var get_opts = {
    host: target.host,
    port: target.port || 80,
    path: (target.pathname || "/") + (target.search || "") + (target.hash || "")
  };
  
  console.log("Received URL: " + util.inspect(target));
  console.log("Remote fetch data: " + util.inspect(get_opts));

  
  (target.protocol == 'https:'
    ?https
    :http).get(get_opts, function(remoteResponse) {
      console.log("Got remote response: " + remoteResponse.statusCode);
      //ugh, nasty hack to provide quick debug echo service
      remoteResponse.setEncoding(encoding='utf8');
      var remoteContent = "";
      
      remoteResponse.on('data', function (chunk) {
        remoteContent += chunk;
      });
      
      remoteResponse.on('end', function (chunk) {
        _respond(response, remoteResponse.statusCode, "", remoteResponse.headers["content-type"],remoteContent);
      });
      
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
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

exports.init = function(){
  
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
