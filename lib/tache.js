var http  = require('http'),
    https = require('https'),
    sys   = require('sys'),
    fs    = require('fs'),
    path  = require('path'),
    url   = require('url'),
    connect = require('connect');

var check    = require('validator').check,
    sanitize = require('validator').sanitize;

var rediscache = require('./redis-cache'),
    util = exports.util = require('./util'),
    Endpoint = require('./endpoint'),
    Fetcher = require('./remote-fetch');

var config = exports.Config = {},
    defaults = {
      port:8000,
      cache:{
        enabled:false,
        ttl:"1h",
        disk:false,
        redis:{
          host:"127.0.0.1",
          port:6379
        }
      },
      from:{
        only:true
      }
    };

function run_request(endpointSelector, target, after) {
  try{
    var ns   = endpointSelector.split('.'),
        path = ns.shift();
    
    var rootObj = require(
      (config.from.dir && config.from.only!==false ?
        config.from.dir + '/' + path:
        path));
    var endpoint = Endpoint.load(rootObj, ns, after);
    
  } catch(e) {
    after({code:404,
        message:"Endpoint init Error",
        detail:"The required endpoint was not found or is unavailable",
        exception:e},
      "");
    return false;
  }
  
  var fetcher = new Fetcher(endpoint.seed, endpoint.expects);
  
  fetcher.on('error',function(err) {
    req.fail.apply(req, err);
  });
  
  fetcher.fetch(target, function(headers, content){
    endpoint.run(headers, content);
  });
  
}

//TODO: allow direct invocation without a bootstrap script, reading paths from argv / env variables?
exports.init = function(_cfg, listen){
  
  config = _cfg
  
  // flag to indicate whether the server should bind to a [host and] port.
  // 99% of the time this will be true -- the major exception is running tests,
  //where expresso does it for us.
  
  if (listen !== false) listen = true;
  
  //establish defaults:
  util.merge(config || {}, defaults);
  
  console.log("Full runtime config is: " + util.inspect(config)+"\n");
  
  exports.Config = config;
  util.freeze(config);
  
  if(config.from.dir && config.from.only===false){
    require.paths.unshift(config.from.dir);
  }
  
  var http_app = require('./http-app')(config, run_request);
  
  //use auth or not?
  //logging?
  
  //setup server
  
  var server = connect();
  //would love to chain these all directly on, but need to have called the connect()
  //constructor so redis-cache can bind to the server's end event
  server
    .use(connect.logger())
    .use(connect.profiler())
    .use(http_app.prepare)
    .use(rediscache(config.cache, server))
    .use('/',http_app.handle);
    
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
