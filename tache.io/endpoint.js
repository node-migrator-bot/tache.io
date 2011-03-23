var assert = require('assert'),
    util   = require('util'),
    events = require('events');

function Endpoint(runFn) {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
    
    assert.equal(typeof runFn,'function');
    this.run = runFn;
}

Endpoint.super_ = events.EventEmitter;
Endpoint.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Endpoint,
    enumerable: false
  }
});

Endpoint.prototype.done = function(headers, body){
  
  //no params?
  if (!headers) this.response.fail(500,"Endpoint Error","Endpoint did not complete in a normal way");
  
  if (headers && !body){
    body = headers;
    headers = {};
  }
  //Set content-type from the magic properties
  ["mime", "type"].map(function(i){
    if(this.response[i]) this.response.setHeader('Content-Type', this.response.[i]);
  });
  
  
  this.response.reply(headers, body);
};

Endpoint.prototype.go = function(response, orig_headers, orig_body){
  
  //store as an instance property to make setting up the convenience functions easier
  this.response = response;
  
  //allow devs to emit 'done' event as well as calling self.done
  this.on('done', this.done);
  
  var self = this;
  
  //rather than calling directly, schedule it for a future tick
  process.nextTick(function(){
    self.run(response, orig_headers, orig_body);
  });
}


module.exports = exports = Endpoint;
