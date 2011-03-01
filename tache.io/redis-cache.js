var events = require('events'),
    redis  = require('redis');


var available = false, client;
    

function RedisCache() {
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
    
    this.__defineGetter__('available',function() {return available;});
}

RedisCache.super_ = events.EventEmitter;
RedisCache.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: RedisCache,
    enumerable: false
  }
});

RedisCache.prototype.init = function(config){
  this.config = config;
  console.log('**** REDIS-CACHE INITALIZING***');
  console.log(config.redis.port, config.redis.host);
  client = redis.createClient(config.redis.port, config.redis.host);
  
  client.on('connect',function() {
    console.log('RC  |  Redis Cache is now available');
    available = true;
  });
  
  client.on('end',function() {
    console.log('RC  |  Redis Cache is no longer available!');
    available = false;
  });
}

RedisCache.prototype.get = function(endpoint_name, url, done){
  client.hgetall(this.key(endpoint_name, url),function (error, reply) {
    console.log('-------Redis reply:--------', error, reply);
    if(!error && reply){
      //Validate redis record
      if(!(reply.content_type && reply.body)){
        //todo: emit error/log something
        return done(error);
      }
      return done(false, reply);
    }
  });
}

RedisCache.prototype.store = function(endpoint_name, url, content_type, body, done){
  var key = this.key(endpoint_name, url);
  client.hmset(key, {content_type:content_type, body:body},function(error){
    client.expire(key, 15, function(error) {
      done(error);
    });
  });
  
  
}

RedisCache.prototype.key = function(endpoint_name, url) {
  //TODO: would like to disambiguate variants on URLS -- maybe use node to parse URL, hash the host, port, path and endpoint_name together?
  return (endpoint_name+':'+url);
};

module.exports = exports = RedisCache;
