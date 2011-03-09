var events = require('events'),
    redis  = require('redis');

var tache = require('./tache'),
    util = require('./util');

var available = false, client;

var cache;    

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

RedisCache.prototype.init = function(){
  console.log('**** REDIS-CACHE INITALIZING***');
  console.log(tache.Config.cache.redis.port, tache.Config.cache.redis.host);
  
  try {
    client = redis.createClient(tache.Config.cache.redis.port, tache.Config.cache.redis.host);
  
    client.on('connect',function() {
      console.log('RC  |  Redis Cache is now available');
      available = true;
    });
    
    client.on('error',function(err) {
      console.log('RC  |  Error connecting to Redis server! ' + err.message);
      available = false;
    });
  
    client.on('end',function() {
      console.log('RC  |  Redis Cache is no longer connected!');
      available = false;
    });
    
  }catch(e){
    //swallow connection errors for now.
  }
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
    client.expire(
      key,
      util.interval(
        tache.Config.cache.redis.ttl || tache.Config.cache.ttl)
      .seconds,
      function(error) { done(error); }
    );
  });
}

RedisCache.prototype.key = function(endpoint_name, url) {
  //TODO: would like to disambiguate variants on URLS -- maybe use node to parse URL, hash the host, port, path and endpoint_name together?
  return (endpoint_name+':'+url);
};

RedisCache.prototype.close = function() {
  client.quit();
  //if the client hasn't quit fast enough, kill it.
  setTimeout(function() {
      try{
        client.end();
      }catch(e){}
    },
    util.interval('2s').seconds); //TODO: make this timeout configurable
};

module.exports = exports = RedisCache;

var prepare_bubble = function(res, req, next){
  var _reply = req.reply;
  
  req.reply = function(content_type, body) {
    console.log("intercepting reply call");
    //try to store in cache
    if(cache && cache.available){
      cache.store(request.endpoint,
        request.target,
        content_type,
        body, function(error) {
          console.log('Response from storing redis value: '+(error || 'Success!'));
        }
      );
    }
    console.log("Trying to call normal reply fn");
    req.reply = _reply;
    req.reply(content_type, body);
  };
  
  next();
}

module.exports.connectAdapter = exports.connectAdapter = RedisCache.connectAdapter = function(config) {
  //setup:
  cache = new RedisCache(); //TODO: use config passed in
  
  //return handler for the 'capture phase'
  return function(req,res,next) {
    if(cache && cache.available //If there is a cache obj
      && !req.headers['x-tache-nocache'] //and this request didn't ask to skip the cache
      && req.endpoint && req.target)  // and this request has been preprocessed   //todo: when spinning off the cache to a separate project, this should just be a cacheKey property
    {
      //try to fetch from the cache
      cache.get(req.endpoint, req.target, function(error, cacheItem) {
        //no item returned means the cache didn't have it, proceed as usual
        if (!cacheItem || cacheItem.expired){
          prepare_bubble(req,res,next);
        } else {
          req.reply(cacheItem.content_type, cacheItem.body);
        }
      });
    }
    else
    {
      prepare_bubble(req,res,next);
    }
  };
};
