var util = require('util'),
    fs   = require('fs'),
    path = require('path');

util.freeze = function(obj){
  for (key in obj){
    if (typeof obj[key] == 'object')
      util.freeze(obj[key]);
  }
  Object.freeze(obj);
}
//crude recursive copy func for objects only
util.merge = function(to,from){
  for (key in from){
    if (!to.hasOwnProperty(key)){
      to[key] = from[key];
    }
    if (typeof to[key] == 'object'){
      this.merge(to[key],from[key]);
    }
  }
};

/* tries to find the following, in this order:
a) given on its own
b) basepath + given,
c) basepath + default

Works for directories or files, emits an error if none of the above are available.
Basepath is the directory of the parent file that called require("tache.io")
*/
util.RESOLVE_DIRS_ONLY = -1;
util.RESOLVE_DIRS_ONLY = 1;
util.resolve = function(basepath, input, _default, rule) {
  var foundPath = false,
      paths     = [input || false,
                  input ? path.resolve(basepath, input):false,
                  path.resolve(basepath, _default)];
  
  for (var i in paths){
    if (!paths[i]) continue;
    //bit of a messy ack with the try/catch and statSync, to emulate a synchronous path.exists
    try{
      var stats = fs.statSync(path.normalize(paths[i]));
      if(
        (rule !== util.RESOLVE_DIRS_ONLY && stats.isFile()) ||
        (rule !== util.RESOLVE_FILES_ONLY && stats.isDirectory())
      ){
        foundPath = path.resolve(path.normalize(paths[i]));
        break;
      }
    }catch(e){
      //swallow statSync errors (probably file-not-found) errors
      continue;
    }
  }
  if(foundPath) return foundPath;
  else throw new Error("Unable to find path '"+input+"' in expected locations ("+paths+")");
};

//Rudely cribbed from https://github.com/onewland/blog/blob/master/js-files/pt-2/cron.js
//with some additions/tweaks to support a terser syntax. ('1h 5s')

function TimeInterval() {
  this.seconds = 0;
  this.addTo = function(ti) {
    this.seconds += ti.seconds;
    return this;
  };
}

function generate_multiplier(multiplier)
{
  return function() {
    var interval = new TimeInterval(); // use var keyword!
    interval.seconds = this * multiplier;
    return interval;
  };
}

Number.prototype.seconds = generate_multiplier(1);
Number.prototype.minutes = generate_multiplier(60);
Number.prototype.hours = generate_multiplier(3600);
Number.prototype.days = generate_multiplier(86400);

util.interval = function(time) {
  var unitMatch = 'mo(?:nth(?:s?))?|w(?:eek(?:s?))?|d(?:ay(?:s?))?|h(?:our(?:s?))?|m(?:inute(?:s?))?|s(?:econd(?:s?))?';
  if(time instanceof TimeInterval)
  {
    return time;
  }
  
  else if(typeof(time) == 'string')
  {
    var interval = new TimeInterval();
    if(time.match(new RegExp("^(\\d+) ?(" + unitMatch + ")")))
    {
      var clauses = time.split(/(\b|[^smohwkdyre])+(?=\d)/);
      var clauses_length = clauses.length;

      for(var i = 0; i < clauses_length; i++)
      {
        var clause_parsed = clauses[i].match(new RegExp("(\\d+) ?(" + unitMatch + ")"));
        if(clause_parsed != null)
        {
          var time = clause_parsed[1];
          var unit = clause_parsed[2];
          switch(unit)
          {
            case 'm': 
            case 'minute': 
              interval.addTo((+time).minutes());
              break;
            case 'h': 
            case 'hour': 
              interval.addTo((+time).hours());
              break;
            case 's': 
            case 'second': 
              interval.addTo((+time).seconds());
              break;
            case 'd': 
            case 'day': 
              interval.addTo((+time).days());
              break;
            case 'w': 
            case 'week': 
              interval.addTo(((+time)*7).days());
              break;
            case 'mo': 
            case 'month': 
              interval.addTo(((+time)*7).days());
              break;
          }
        }
      }
    } 

    else
    {
      var unit_parse = time.match(new RegExp(unitMatch));

      if(unit_parse != null)
      {
        switch(unit_parse[0])
        {
          case 'm': 
          case 'minute':
            interval.addTo((1).minutes());
            break;
          case 'h': 
          case 'hour': 
            interval.addTo((1).hours());
            break;
          case 's': 
          case 'second': 
            interval.addTo((1).seconds());
            break;
          case 'd': 
          case 'day': 
            interval.addTo((1).days());
            break;
        }
      }
    }
    return interval;
  }
}

module.exports = exports = util;