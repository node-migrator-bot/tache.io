var assert = require('assert');

var Endpoint = require('./endpoint'),
    Fetcher = require('./remote-fetch');


//Force this to be a connect 'provider' --nothing below this in the stack
module.exports = exports = function(config) {
  
  return function(req, res){
    try{
      var ns   = req.endpoint.split('.'),
          path = ns.shift();
      
      var rootObj = require(
        (config.from.dir && config.from.only!==false ?
          config.from.dir + '/' + path:
          path));
      var endpoint = Endpoint.load(rootObj, ns, res);
      
      assert.equal(typeof endpoint[func],'function');
      
    } catch(e) {
      req.fail(404, "Endpoint not available", "The required endpoint was not found or is unavailable",e);
      return false;
    }
    
    var fetcher = new Fetcher(endpoint[func].seed || endpoint.seed || false, endpoint.expects || false);
    
    fetcher.on('error',function(err) {
      req.fail.apply(req, err);
    });
    
    fetcher.fetch(req.target, function(headers, content){endpoint.run(headers, content);});
  
  };
};
