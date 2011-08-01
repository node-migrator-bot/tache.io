var http   = require('http'),
    https  = require('https'),
    util   = require('util'),
    url    = require('url'),
    events = require('events');


var MAX_REDIRECTS = 20;

function Fetcher(seed_url, encoding) {
  events.EventEmitter.call(this);
  
  this.super     = events.EventEmitter;
  this.cookies   = {};
  this.redirects = 0;
  this.encoding  = encoding || 'utf8';
  this.seeding   = false;
  this.queued    = [];
  
  //prepare the environment with an initial request.
  //swallow any errors, don't want a bad seed URL to completely kill things
  if (seed_url){
    try {
      this.seeding = true;
      this._fetch(seed_url, 'seeded');
    }
    catch (err) {
      // log to console, but that's it.
      console.log("WARNING: Seeding remote request with '" + seed_url + "' threw an error, continuing anyway.  Error:" + err.message);
      this.emit('seeded');
    }
  }
};

Fetcher.super_ = events.EventEmitter;

Fetcher.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Fetcher,
    enumerable: false
  }
});


Fetcher.prototype.fetch = function(target_url, callback) {


  var self = this,
      run = function() {
        self.seeding = false;
        self.redirects = 0;
        self._fetch(target_url, 'fetched');
      };
  //if we're in the process of seeding, let it finish first
  if(this.seeding === true){
    self.on('seeded', run);
  } else {
    run();
  }
  
  this.on('fetched', callback );
}

//'private' method to actually run requests
Fetcher.prototype._fetch = function(target_url, evt) {
  var self = self || this;
      //parse URL, then rebuild in the form the HTTP[S].get() expects
  var target   = url.parse(target_url),
      get_opts = {
        host: (target.auth ? target.auth+'@'+target.hostname : target.hostname),
        path: (target.pathname || "/") + (target.search || "") + (target.hash || ""),
        headers:{'Cookie':'',
          'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.122 Safari/534.30'}
      };
  if (target.port){
    get_opts.port = target.port;
  }
  for (var cookie_name in self.cookies){
    get_opts.headers.Cookie += cookie_name + "=" + self.cookies[cookie_name] + '; ';
  }
  
  (target.protocol == 'https:'
    ?https
    :http).get(get_opts, function(remote) {
      
      //if we're being told to redirect, deal with response cookie headers etc then redirect
      if (remote.statusCode >=300 && remote.statusCode < 400 && remote.headers['location']){
        //redirect to given location
        if (self.redirects > MAX_REDIRECTS){
          self.emit('error',
            //TODO: is 502 the most appropriate response code for too many redirects? Maybe 504 (Gateway Timeout)?
            [ 502, "Too many redirects", "The remote resource caused too many redirects (" + MAX_REDIRECTS + ")"]);
          return false;
        } else {
          if (remote.headers['set-cookie'])
          {
            remote.headers['set-cookie'].map(function(cookie){
              cookie_kv = cookie.split(';')[0].split('=');
              self.cookies[cookie_kv[0]] = cookie_kv[1];
            });
          }
          self.redirects++;
          return self._fetch(remote.headers['location'], evt);
        }
      }
      
      //slight shortcut: if seeding and done with redirects, skip the body, just emit
      if (self.seeding) {
        self.emit(evt);
      }
      else
      {
        remote.setEncoding(self.encoding);
        var content = "";
        
        remote.on('data', function (chunk) {
          content += chunk;
        });
        
        remote.on('end', function(){
          var context = target;
          context.cookies = self.cookies;
          context.headers = get_opts.headers;
          self.emit(evt, remote.headers, content, context);
        });
      }
    }).on('error', function(e) {
      self.emit('error',[ 404, "Remote error", "Couldn't fetch the remote resource", e]);
    });
}

module.exports = Fetcher;
