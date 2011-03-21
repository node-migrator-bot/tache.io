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

Endpoint.prototype.go = function(incoming_content_type, target, after){
  
  //rather than calling directly, let the runloop schedule it;
  //trying to be deferential to incoming requests and block as little as possible.
  this.on('run', function(){
    this.run(incoming_content_type, target);
  });
  
  this.on('done', function(result_content_type, result, ttl){
    ttl = ttl || false;
    after(result_content_type, result, ttl);
  })
  
  this.emit('run');
}

//convenience fn for emitting
Endpoint.prototype.done = function(){}


module.exports = exports = Endpoint;
