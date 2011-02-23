var util = require('util');

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

module.exports = exports = util;