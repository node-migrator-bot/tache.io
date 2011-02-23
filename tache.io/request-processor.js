var http   = require('http'),
    https  = require('https'),
    util   = require('util'),
    url    = require('url'),
    events = require('events');

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


RequestProcessor.prototype.init = function(endpoint_name, target_url){
  var self = this;
  try{
    var endpoint = require(endpoint_name);
    
    //TODO: add new endpoint structural validation, make sure we're not about to call garbage.
    
  } catch(e)
  {
    throw new Error({
      reason:"Endpoint not available",
      msg:"The required endpoint was not found or is unavailable",
      thrown:e
    });
  }
  
  //parse URL, then rebuild in the form the HTTP[S].get() expects
  var target   = url.parse(target_url),
      get_opts = {
        host: target.host,
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
        
        endpoint.init(
          response.headers['content-type'],
          content,
          function(content_type, body){
            self.emit('complete', content_type, body);
          });
      });
      
    }).on('error', function(e) {
      throw new Error({
        reason: "Retrieval error",
        msg: "Couldn't get the remote resource.", 
        thrown: e, 
      });
    });
}


module.exports = exports = RequestProcessor;