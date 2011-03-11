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
var fetch = function(self, target_url, endpoint, redirects, cookies) {
  var redirects = redirects || 0,
      //parse URL, then rebuild in the form the HTTP[S].get() expects
      target    = url.parse(target_url),
      get_opts  = {
        host: (target.auth ? target.auth+'@'+target.hostname : target.hostname),
        port: target.port || 80,
        path: (target.pathname || "/") + (target.search || "") + (target.hash || ""),
        headers:{
          'Cookie':(cookies || "")
        }
      };

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
          var cookies = cookies || "";
          if(response.headers['set-cookie'])
          {
            cookies += '; ' + response.headers['set-cookie'];
          }
          return fetch(self, response.headers['location'], endpoint, ++redirects, cookies);
        }
      }

      //TODO: support non-UTF8: want untouched binary streams for things like images.
      response.setEncoding(encoding='utf8');
      var content = "";

      response.on('data', function (chunk) {
        content += chunk;
      });

      response.on('end', function () {
        endpoint.go(
          response.headers['content-type'] || '',
          content || '',
          function(content_type, body){
            self.emit('complete', content_type, body);
        });
      });

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
  
  fetch(self, target_url, endpoint);
};


module.exports = exports = RequestProcessor;