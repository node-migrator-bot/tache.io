var assert = require('assert'),
    http   = require('http'),
    https  = require('https'),
    util   = require('util'),
    url    = require('url'),
    events = require('events');

var Endpoint = require('./endpoint');

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


RequestProcessor.prototype.init = function(endpoint_path, endpoint_name, target_url){
  var self = this;
  
  //Load the endpoint, validate it, emit errors if encountered.
  try{
    console.log('Trying to load endpoint from ' + require.resolve(endpoint_path + endpoint_name));
    var endpoint_def = require(endpoint_path + endpoint_name);
    var endpoint = new Endpoint(endpoint_def);
    
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
  
  //parse URL, then rebuild in the form the HTTP[S].get() expects
  var target   = url.parse(target_url),
      get_opts = {
        host: (target.auth ? target.auth+'@'+target.hostname : target.hostname),
        port: target.port || 80,
        path: (target.pathname || "/") + (target.search || "") + (target.hash || "")
      };
  
  (target.protocol == 'https:'
    ?https
    :http).get(get_opts, function(response) {
      
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


module.exports = exports = RequestProcessor;