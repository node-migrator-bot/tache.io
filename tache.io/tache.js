var http  = require('http'),
    https = require('https'),
    sys   = require('sys'),
    fs    = require('fs'),
    util  = require('util'),
    path  = require('path');
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
  
  http.createServer(function(req, res) {
    setTimeout(function() {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.write('Hello World');
      res.end();
    }, 2000);
  }).listen(
    config.port,
    config.hostname,
    function(){
      sys.puts('Tache.io server running on '+ (config.hostname || '[INADDR_ANY]') + ':' + config.port );
  });
}
