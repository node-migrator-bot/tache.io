var assert = require('assert'),
    http   = require('http'),
    https  = require('https'),
    util   = require('util'),
    url    = require('url'),
    events = require('events');

var Endpoint = require('./endpoint');

var MAX_REDIRECTS = 20;

function Fetcher() {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
}

Fetcher.super_ = events.EventEmitter;

Fetcher.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Fetcher,
    enumerable: false
  }
});

//'private' method to actually run requests
Fetcher.prototype.fetch = function(self, target_url, callback, redirects, cookies) {
  var cookies   = cookies || {},
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
    :http).get(get_opts, function(remote) {
      
      //Deal with response headers; redirects, cookies etc
      if(remote.statusCode >=300 && remote.statusCode < 400 && remote.headers['location']){
        //redirect to given location
        if(redirects > MAX_REDIRECTS){
          self.emit('error',
            //TODO: is 502 the most appropriate response code for too many redirects? Maybe 504 (Gateway Timeout)?
            [ 502, "Too many redirects", "The remote resource caused too many redirects (" + MAX_REDIRECTS + ")"]);
          return false;
        }else{
          if(remote.headers['set-cookie'])
          {
            remote.headers['set-cookie'].map(function(cookie){
              cookie_kv = cookie.split(';')[0].split('=');
              cookies[cookie_kv[0]] = cookie_kv[1];
            });
          }
          return self.fetch(self, remote.headers['location'], callback, ++redirects, cookies);
        }
      }

      //TODO: support non-UTF8: want untouched binary streams for things like images.
      remote.setEncoding(encoding='utf8');
      var content = "";

      remote.on('data', function (chunk) {
        content += chunk;
      });

      remote.on('end', function(){callback(remote, content, cookies);});

    }).on('error', function(e) {
      self.emit('error',[ 404, "Remote error", "Couldn't fetch the remote resource", e]);
      return false;
    });
}

//Force this to be a connect 'provider' --nothing below this in the stack
module.exports = exports = function(config) {
  
  return function(req, res){
  
    try{
      var endpoint_def = require(config.paths.endpoints + req.endpoint),
          endpoint     = new Endpoint(endpoint_def);
      assert.equal(typeof endpoint.go,'function');
    } catch(e)
    {
      req.fail(404, "Endpoint not available", "The required endpoint was not found or is unavailable",e);
      return false;
    }
    
    var fetcher = new Fetcher();
    
    fetcher.on('error',function(err) {
      request.fail.apply(request, err);
    });
    
    var fetched = function(remoteResponse, content){
      endpoint.go(res, remoteResponse.headers, content);
    }
    
    if(endpoint_def.env_seed){
      fetcher.fetch(fetcher, endpoint_def.env_seed, function (response, content, seed_cookies) {
        fetcher.fetch(fetcher, req.target, fetched, 0, seed_cookies);
      });
    }
    else
    {
      fetcher.fetch(fetcher, req.target, fetched);
    }
  
  };
};