var assert = require('assert'),
    util   = require('./util');
    events = require('events');

var default_meta = {
  expects:"utf8",
  emits:"utf8",
  ttl:"1m"
};

function Endpoint(response) {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
    this.response = response;
    this.on('done',this.done);
}

Endpoint.super_ = events.EventEmitter;
Endpoint.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Endpoint,
    enumerable: false
  }
});

Endpoint.load = function(obj, ns, response, parent_meta) {
  //go down each part of the name array, looking for an obj with an Endpoint property.
  //if we don't find and Endpoint property, try and subclass the obj
  
  if(!obj.Endpoint){
    Endpoint.subclass(obj, parent_meta);
  }
  if(ns.length == 0) {
    //then we're dealing with the current obj.
    //create a new instance of it for this request/response
    return new obj.Endpoint(response);
  } else {
    sub = ns.shift();
    if(!obj[sub]){
      throw new Error("Loaded object doesn't have a property '" + sub + "' Object is:\n" + util.inspect(obj) + "\n\n");
    }
    return Endpoint.load(obj[sub], ns, response, obj.meta);
  }
  
};

Endpoint.subclass = function(obj, parent_meta) {
  /*
  Take a `require()`ed obj, give it a subproperty that inherits Endpoint so that it can be instantiated per-request.
  Because we're always acting on the require()ed object, we only have to do this once in a app lifecycle; any later
  requests can just check for the Endpoint property and create a new instance for this request.
  */
  
  if (!obj.run || typeof(obj.run) !== 'function') {
    throw new Error("Can't construct endpoint from this object ");
  }
  
  var subclass = function(response) {
    Endpoint.apply(this, [response]);
  };
  util.inherits(subclass, Endpoint);
  subclass.prototype._run = obj.run;
  subclass.prototype.meta = obj.meta || {};
  if(parent_meta) {
    util.merge(subclass.prototype.meta, parent_meta);
  } else {
    util.merge(subclass.prototype.meta, default_meta);
  }
  
  for (var i in default_meta){
    Object.defineProperty(subclass.prototype, i,
      {get : function(){ return this.meta[i]; },
      enumerable : true,
      configurable : true});
  }
  
  obj.Endpoint = subclass;
  
};

Endpoint.prototype.run = function(headers, body){
  //todo: is there any point in wrapping the run func? Can't it be exposed directly?
  //only wrap if there's extra work/binding that needs doing
  this._run(headers, body);
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
