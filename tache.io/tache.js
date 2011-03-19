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
    RequestProcessor = require('./request-processor'),
    util = require('./util');

var config = exports.Config = {},
    defaults = {
      paths:{
        endpoints:'endpoints/',
        transforms:'transforms/'
        
      },
      port:8000,
      cache:{
        enabled:true,
        ttl:"1h",
        disk:false,
        redis:{
          host:"127.0.0.1",
          port:6379
        }
      }
    };

var _prepare = function(request, response, next){
  
  //bind some functions in to context
  //TODO: set up a top-level response timeout just in case everything blows up?
  request.fail  = function(status,reason,msg,exception){
    _respond(response,status,reason,'text-plain',msg+'\n',function(){
      console.log("Rejecting request to " + request.url + ' : ' + msg);
      //if(exception) console.log('Request failed due to error:\n'+ exception.stack);
    });};
  request.reply = function(content_type,body, after){
    _respond(response,200,"OK",content_type, body, after);
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
  
  request.endpoint = endpoint_name;
  request.target = target_url;
  
  next();
};

var _process = function(request, response) { //No 'next' -- forces this to always be the bottom of the stack (desireable?)
  var processor = new RequestProcessor();

  processor.on("complete", function(content_type, body){
    //reply to client with content
    request.reply(content_type, body);
  });

  processor.on("critical", function(err){
    return request.fail(err.status, err.reason, err.msg, err.thrown);
  });
  
  processor.init(request.endpoint, request.target);
  
};

var _respond = function(response, status, reasonPhrase, content_type, body, after){
  response.writeHead(status, reasonPhrase || "", {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': content_type });
  response.end(body, 'utf-8');

  if (after) after();
}

//TODO: allow direct invocation without a bootstrap script, reading paths from argv / env variables?
exports.init = function(config_file, listen){
  
  // flag to indicate whether the server should bind to a [host and] port.
  // 99% of the time this will be true -- the major exception is running tests,
  //where expresso does it for us.
  
  if (listen !== false) listen = true;
  
  //Read config
  //find the path of the file that invoked us.
  //TODO: support repl?
  var basepath = path.dirname(module.parent.filename) + '/';
  try
  {
    config_path = util.resolve(basepath, config_file, 'tache-config.json',util.RESOLVE_FILES_ONLY);
  }catch(e){
    throw new Error("Unable to start Tache.io: No config file: " + e.message);
  }
  
  console.log('Using config file '+ config_path + ':');
  
  try{
    config = JSON.parse(fs.readFileSync(config_path, "utf8"));
  }catch(e){
    throw new Error("Unable to load config file: Check for JSON structural issues, e.g. fully double-quoted keys etc?\n\t"+e.message);
  }
  //TODO: Nice idea: watch config file for changes and dynamically reload?
  
  //establish defaults:
  util.merge(config, defaults);
  
  //Rewrite the basedir to be where the config file is. That's probably a more intuitive
  //location to look for endpoint classes, transform functions than the bootstrapper
  basepath = path.dirname(config_path) + '/';
  
  //Establish endpoint and tranform dirs
  try{
    ['endpoints','transforms'].forEach(function(item){
      config.paths[item] = util.resolve(basepath, config.paths[item], item+'/', util.RESOLVE_DIRS_ONLY) + '/';
    });
  }catch(e){
    throw new Error("Unable to find endpoint/tranform directories, please check your config\n\t"+e.message);
  }
  
  console.log("Full runtime config is: " + util.inspect(config)+"\n");
  
  exports.Config = config;
  util.freeze(config);
  
  //use auth or not?
  //logging?
  //locations of endpoint code?
      //endpoint location path retrieved from env, or config file etc.
  
  
  //setup server
  
  var server = connect();
  //would love to chain these all directly on, but need to have called the connect()
  //constructor so redis-cache can bind to the server's end event
  server
    .use(connect.logger())
    .use(connect.profiler())
    .use(_prepare)
    .use(rediscache(config.cache, server))
    .use('/',_process);
    
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
