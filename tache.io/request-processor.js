var assert = require('assert'),
    http   = require('http'),
    https  = require('https'),
    util   = require('util'),
    url    = require('url'),
    events = require('events');

var Endpoint = require('./endpoint');

var MAX_REDIRECTS = 20;

function RequestProcessor() {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
}

RequestProcessor.super_ = events.EventEmitter;
RequestProcessor.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: RequestProcessor,
    enumerable: false
  }
});

//'private' method to actually run requests
var fetch = function(self, target_url, callback, redirects, cookies) {
  var cookies = cookies || {},
      redirects = redirects || 0,
      //parse URL, then rebuild in the form the HTTP[S].get() expects
      target    = url.parse(target_url),
      get_opts  = {
        host: (target.auth ? target.auth+'@'+target.hostname : target.hostname),
        port: target.port || 80,
        path: (target.pathname || "/") + (target.search || "") + (target.hash || ""),
        headers:{'Cookie':''}
      };
      for(var cookie_name in cookies){
        get_opts.headers.Cookie += cookie_name + "=" + cookies[cookie_name] + '; ';
      }
  (target.protocol == 'https:'
    ?https
    :http).get(get_opts, function(response) {
      if(response.statusCode >=300 && response.statusCode < 400 && response.headers['location']){
        //redirect to given location
        if(redirects > MAX_REDIRECTS){
          self.emit('critical',{
            status:502, //TODO: is 502 the most appropriate response code for too many redirects? Maybe 504 (Gateway Timeout)?
            reason:"Too many redirects",
            msg:"The remote resource caused too many redirects (" + MAX_REDIRECTS + ")",
          });
          return false;
        }else{
          if(response.headers['set-cookie'])
          {
            response.headers['set-cookie'].map(function(cookie){
              cookie_kv = cookie.split(';')[0].split('=');
              cookies[cookie_kv[0]] = cookie_kv[1];
            });
          }
          return fetch(self, response.headers['location'], callback, ++redirects, cookies);
        }
      }

      //TODO: support non-UTF8: want untouched binary streams for things like images.
      response.setEncoding(encoding='utf8');
      var content = "";

      response.on('data', function (chunk) {
        content += chunk;
      });

      response.on('end', function(){callback(response, content, cookies);});

    }).on('error', function(e) {
      self.emit('critical',{
        status:404,
        reason:"Remote error",
        msg:"Couldn't fetch the remote resource",
        thrown:e
      });
      return false;
    });
}

RequestProcessor.prototype.init = function(endpoint_name, target_url){
  var self = this;
  
  //Load the endpoint, validate it, emit errors if encountered.
  try{
    var endpoint_def = require(require('./tache').Config.paths.endpoints + endpoint_name),
        endpoint     = new Endpoint(endpoint_def);
    
    assert.equal(typeof endpoint.go,'function');
  } catch(e)
  {
    self.emit('critical',{
      status:404,
      reason:"Endpoint not available",
      msg:"The required endpoint was not found or is unavailable",
      thrown:e
    });
    return false;
  }
  
  var finalResponse = function (response, content) {
      endpoint.go(
        response.headers['content-type'] || '',
        content || '',
        function(content_type, body, ttl){
          self.emit('complete', content_type, body, ttl);
      });
    };
    
  if(endpoint_def.env_seed){
    fetch(self, endpoint_def.env_seed, function (response, content, seed_cookies) {
      fetch(self, target_url, finalResponse, 0, seed_cookies);
    });
  }
  else
  {
    fetch(self, target_url,finalResponse);
  }
  
  
};


module.exports = exports = RequestProcessor;