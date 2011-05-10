var assert = require('assert');

var Endpoint = require('./endpoint'),
    Fetcher = require('./remote-fetch');


//Force this to be a connect 'provider' --nothing below this in the stack
module.exports = exports = function(config) {
  
  return function(req, res){
    try{
      var parts        = req.endpoint.split('.'),
          path         = parts[0],
          func         = parts[1] || 'do';
      
      var endpoint_def = require(
        (config.from_dir?
          config.from_dir + '/' + path:
          path));
      
      var endpoint = Endpoint.factory(endpoint_def, res);
      
      assert.equal(typeof endpoint[func],'function');
      
    } catch(e) {
      req.fail(404, "Endpoint not available", "The required endpoint was not found or is unavailable",e);
      return false;
    }
    
    var fetcher = new Fetcher(endpoint[func].seed || endpoint.seed || false, endpoint.expects || false);
    
    fetcher.on('error',function(err) {
      req.fail.apply(req, err);
    });
    
    fetcher.fetch(req.target, function(headers, content){endpoint[func](headers, content);});
  
  };
};
