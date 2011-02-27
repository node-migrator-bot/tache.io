var http   = require('http'),
    tache  = require("tache.io"),
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
  },
  "No-op echoes content": function(){
    //spool up a hello world server
    var randomBodyContent = (Math.random() * 100000) + '\n';
    var testServer = http.createServer(function(req, res){
        res.writeHead(200, {
          'Content-Length': randomBodyContent.length,
          'Content-Type': 'text/plain' });
        req.on('end', function(){
            res.end(randomBodyContent);
            testServer.close();
        });
    });
    testServer.listen(3000);
    
    assert.response(server, {
      url:"/echo.noop/http://127.0.0.1:3000/"
    },{
      body:randomBodyContent
    });
  },

}