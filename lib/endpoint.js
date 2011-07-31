var assert = require('assert'),
    util   = require('./util');
    events = require('events');

var default_meta = {
  expects:"utf8",
  emits:"utf8",
  ttl:"1m",
  seed:false
};

//To save having to redeclare this inside the constructor every time
//for the private callback variable, just declare it once up here and
//bind in the callback at instantiation.

//(Not that it matters because I'm redeclaring a fail function
//every time in the constructor anyway, but ah well...)

function Done(callback, error, body){
  
  //build up a hash with all our response (meta)info.
  //this is so that in API mode, no info about the instance ever 'leaks'.
  //Don't want to expose the enpoint object directly.
  
  var response = {};
  response.body = body || "";
  
  if (!this.headers && !error) {
    //todo: make this a nicer error return format....
    error = {code:500,
      message:"Endpoint Error",
      detail:"Endpoint did not complete in a normal way, no output headers"};
  }
  
  response.headers = this.headers || {};
  
  //Move magic content-type properties to a real header
  ["mime", "contentType"].forEach(function(i){
    if(this[i]) {
      response.headers['Content-Type'] = this[i];
      delete(this[i]);
    }
  }, this);
  
  //move convenience encoding property to response
  response.encoding = this.emits;
  
  //move ttl over
  response.ttl = this.ttl;
  
  callback(error, response);
};


function Endpoint(callback) {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
    
    //TODO: is there a good reason not to just have the exact same
    //bound function for errors and success? just force
    //endpoint implementors to emit an error property || false?
    
    //four ways to succeed:
    this.done = this.reply = Done.bind(this, callback, false);
    this.on('done',this.done);
    this.on('reply',this.done);
    
    //three ways to fail:
    //TODO: could just be another bind, if I was willing to sacrifice
    //enforcing an err obj (which is only done because there's no way
    //for Done to know if it's being called as an error or not)
    //if fail is oppered as an PI method, then it should absolutely
    //definitely fail: Can't have the risk of people calling fail() with
    //no args and sending a 200 back!
    this.fail = function(err, body) {
      Done(callback,
        err || {code:500,
          message:"Endpoint Error",
          detail:"Endpoint did not complete in a normal way, no output headers"},
        body);
    } 
    this.on('fail',this.fail);
    this.on('error',this.fail);
}

Endpoint.super_ = events.EventEmitter;
Endpoint.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Endpoint,
    enumerable: false
  }
});

Endpoint.load = function(obj, ns, callback, parent_meta) {
  //go down each part of the name array, looking for an obj with an Endpoint property.
  //if we don't find and Endpoint property, try and subclass the obj
  
  if(!obj.Endpoint){
    Endpoint.subclass(obj, parent_meta);
  }
  if(ns.length == 0) {
    //then we're dealing with the current obj.
    //create a new instance of it for this request/response
    return new obj.Endpoint(callback);
  } else {
    sub = ns.shift();
    if(!obj[sub]){
      throw new Error("Loaded object doesn't have a property '" + sub + "' Object is:\n" + util.inspect(obj) + "\n\n");
    }
    return Endpoint.load(obj[sub], ns, callback, obj.meta);
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
  
  var subclass = function(callback) {
    Endpoint.call(this, callback);
  };
  util.inherits(subclass, Endpoint);
  subclass.prototype._run = obj.run;
  subclass.prototype.meta = obj.meta || {};
  
  util.merge(subclass.prototype.meta, parent_meta || default_meta);
  
  var bindGetter = function(prop) {
    Object.defineProperty(subclass.prototype, prop,
      {get : function(){
        return this.meta[prop];
        },
      enumerable : true,
      configurable : true});
  };
  
  for (var i in subclass.prototype.meta){
    bindGetter(i);
  }
  
  obj.Endpoint = subclass;
  
};

Endpoint.prototype.run = function(headers, body){
  //todo: is there any point in wrapping the run func? Can't it be exposed directly?
  //only wrap if there's extra work/binding that needs doing
  this._run(headers, body);
};

module.exports = exports = Endpoint;
