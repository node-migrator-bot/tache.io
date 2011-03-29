var assert = require('assert'),
    util   = require('./util');
    events = require('events');

function Endpoint() {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
}

Endpoint.super_ = events.EventEmitter;
Endpoint.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Endpoint,
    enumerable: false
  }
});

Endpoint.factory = function(obj, response) {
  var endpoint = new Endpoint();
  util.merge(endpoint,obj);
  
  endpoint.response = response;
  //allow devs to emit 'done' event as well as calling self.done
  endpoint.on('done', endpoint.done);
  
  endpoint.expects = endpoint.expects || 'utf8';
  endpoint.emits = endpoint.emits || 'utf8';
  return endpoint;
};

Endpoint.prototype.done = Endpoint.prototype.reply = function(headers, body){
  
  //no params?
  if (!headers) this.response.fail(500,"Endpoint Error","Endpoint did not complete in a normal way");
  
  if (headers && !body){
    body = headers;
    headers = {};
  }
  //Set content-type from the magic properties
  ["mime", "type"].forEach(function(i){
    if(this.response && this.response[i]) this.response.setHeader('Content-Type', this.response[i]);
  }, this);
  
  if(this.emits) this.response.encoding = this.emits;
  
  this.response.reply(headers, body);
};

module.exports = exports = Endpoint;
