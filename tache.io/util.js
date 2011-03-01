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

module.exports = exports = util;