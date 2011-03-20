var events = require('events'),
    redis  = require('redis');

var tache = require('./tache'),
    util = require('./util');


function RedisCache() {   //TODO: use config passed in
    events.EventEmitter.call(this);
    this.super = events.EventEmitter;
    
    this.__defineGetter__('available',this.available);
    
    this.init();
}

RedisCache.super_ = events.EventEmitter;
RedisCache.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: RedisCache,
    enumerable: false
  }
});

RedisCache.prototype.init = function(){
    
  try {
    this.client = redis.createClient(tache.Config.cache.redis.port, tache.Config.cache.redis.host);
    
    this.client.on('connect',function() {
      console.log('[Redis-Cache]  Redis Cache is now available');
    });
    
    this.client.on('error',function(err) {
      console.log('[Redis-Cache]  Error connecting to Redis server! ' + err.message);
    });
  
    this.client.on('end',function() {
      console.log('[Redis-Cache]  Redis Cache is no longer connected!');
    });
    
  }catch(e){
    //swallow connection errors for now.
  }
}

RedisCache.prototype.get = function(endpoint_name, url, done){
  this.client.hgetall(this.key(endpoint_name, url),function (error, reply) {
    //console.log('-------Redis reply:--------', error, reply);
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
  this.client
    .multi()
    .hmset(key, {content_type:content_type, body:body})
    .expire(
      key,
      util.interval(tache.Config.cache.redis.ttl || tache.Config.cache.ttl).seconds)
    .exec(
      function(error) { done(error); }
    );
}

RedisCache.prototype.available = function () {
  return ((this.client && this.client.connected) || false);
}

RedisCache.prototype.key = function(endpoint_name, url) {
  //TODO: would like to disambiguate variants on URLS -- maybe use node to parse URL, hash the host, port, path and endpoint_name together?
  return (endpoint_name+':'+url);
};

RedisCache.prototype.close = function() {
  if(this.client)
  {
    this.client.quit();
    //if the client hasn't quit fast enough, kill it.
    setTimeout(function() {
        try{
          this.client.end();
        }catch(e){}
      },
      util.interval('2s').seconds); //TODO: make this timeout configurable
  }
};

//The middleware function to be called with connectServer.use()
module.exports = exports = function(config, server) {
  
  if(config.enabled)
  {
    //Spinup a redis client for this server instance
    var cache = new RedisCache(config);
  
    server.on('close', function(){cache.close();});
  
    //define function for the 'bubble phase'
    //hook into the reply function of the response, then continue with
    //the rest of the chain
    function setupBubble(req, res, next){
      var _reply = req.reply;
      req.reply = function(content_type, body) {
        //try to store in cache
        if(cache && cache.available){
          cache.store(this.endpoint,
            this.target,
            content_type,
            body, function(error) {
              console.log('Response from storing redis value: '+(error || 'Success!'));
            }
          );
        }
        req.reply = _reply;
        req.reply(content_type, body);
      };
      next();
    };
  
    //return handler for the 'capture phase'
    return function(req, res, next) {
    
      if(cache && cache.available //If there is a cache obj
        && !req.headers['x-tache-nocache'] //and this request didn't ask to skip the cache
        && req.endpoint && req.target)  // and this request has been preprocessed   //todo: when spinning off the cache to a separate project, this should just be a cacheKey property
      {
        //try to fetch from the cache
        cache.get(req.endpoint, req.target, function(error, cacheItem) {
          if (!cacheItem || cacheItem.expired){
            //not in cache; continue.
            setupBubble(req, res, next);
          } else {
            //reply with the cached data, don't continue down
            req.reply(cacheItem.content_type, cacheItem.body);
          }
        });
      }
      else
      {
        setupBubble(req, res, next);
      }
    };
  }
  else
  {
    return function(req, res, next) { next(); };
  }
};