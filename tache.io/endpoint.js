var util   = require('util'),
    events = require('events');

function Endpoint(runFn) {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
    this.run = runFn;
}

Endpoint.super_ = events.EventEmitter;
Endpoint.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Endpoint,
    enumerable: false
  }
});

Endpoint.prototype.init = function(incoming_content_type, target, after){
  
  //rather than calling directly, let the runloop do the work;
  //trying to be deferential to incoming requests and block as little as possible.
  this.on('run', function(){
    this.run(incoming_content_type, target);
  });
  
  this.on('done', function(result_content_type, result){
    after(result_content_type, result);
  })
  
  this.emit('run');
}


module.exports = exports = Endpoint;
