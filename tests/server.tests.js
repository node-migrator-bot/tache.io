var tache = require("tache.io"),
    assert = require('assert');

var server = tache.init('', false);

module.exports = {

  "Unknown endpoint 404":function(){
    assert.response(server, {
      url:"/qwertyuiop/asdfghjkl/http://www.google.com"
    },{
      body:"The required endpoint was not found or is unavailable\n"
    });
  }

}