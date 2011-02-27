var tache = require("tache.io"),
    assert = require('assert');

var server = tache.init('test-config.json', false);

//TODO: would be nice to have these in a config somewhere, available globally and called by key
// (like an internationalization file). Would avoid having to duplicate them exactly here.
var responses = {
  bad_endpoint:"The required endpoint was not found or is unavailable\n"
};

module.exports = {

  "Unknown endpoint 404":function(){
    assert.response(server, {
      url:"/qwertyuiop/asdfghjkl/http://www.example.com"
    },{
      body:responses.bad_endpoint
    });
  },
  
  "Broken endpoint 404":function(){
    assert.response(server, {
      url:"/broken.endpoint/http://www.example.com"
    },{
      body:responses.bad_endpoint
    });
  }

}