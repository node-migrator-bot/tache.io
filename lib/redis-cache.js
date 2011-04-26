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
    if(!error && reply){
      //Validate redis record
      //TODO: validate some key headers?
      if(!(reply.__body)){
        //todo: emit error/log something
        return done(new Error('Empy reply from redis-cache'));
      }
      return done(false, reply);
    }
  });
}

RedisCache.prototype.store = function(endpoint_name, url, headers, body, ttl, done){
  var key = this.key(endpoint_name, url);
  if (isNaN(ttl))
    ttl = util.interval(ttl || tache.Config.cache.redis.ttl || tache.Config.cache.ttl).seconds;
  
  //tack the body on to the headers hash (bit fugly, but functional and faster than messing around)
  headers.__body = body;
  
  this.client
    .multi()
    .hmset(key, headers)
    .expire(key, ttl)
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
    //hook into the relevant response functions, then run
    //the rest of the chain
    function setupBubble(req, res, next){
      
      // Hook end fn -- read body
      //TODO: this will fail horribly for buffered responses!
      var _end = res.end;
      res.end = function(body) {
        
        //try to store in cache
        var ttl = res.ttl || false;
        if(cache && cache.available){
          cache.store(
            req.endpoint, req.target,
            (res._headers || {}), body,
            ttl,
            function(error) {
              console.log('Response from storing redis value: '+(error || 'Success!'));
            }
          );
        }
        res.end = _end;
        res.end.apply(res, arguments);
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
          if (!cacheItem){
            //not in cache; continue.
            setupBubble(req, res, next);
          } else {
            //reply with the cached data, don't continue down
            var body = cacheItem.__body;
            delete cacheItem.__body;
            req.reply(cacheItem, body);
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