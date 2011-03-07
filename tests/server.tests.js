var http   = require('http'),
    tache  = require("tache.io"),
    //tache  = require("../coverage/"),
    assert = require('assert');

var server = tache.init('test-config.json', false);
var offlineOnly = (process.argv[3] == "offline");

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
    var randomBodyContent = (Math.random() * 100000) + '\n',
        testServer        = http.createServer(function(req, res){
            res.writeHead(200, {
              'Content-Length': randomBodyContent.length,
              'Content-Type': 'text/plain' });
            req.on('end', function(){
                testServer.close(); 
                res.end(randomBodyContent);
            });
        });
    
    testServer.listen(3000);
    
    assert.response(server, {
      url:"/echo.noop/http://127.0.0.1:3000/",
      headers:{'x-tache-nocache':'true'} //clear out the cache -- multiple frequent test runs agains the same redis sever will have some other value stored
    },{
      body:randomBodyContent
    });
  }
}

if(!offlineOnly){
  //add tests that depend on remote resources.
  
  
  //note: relies on http://www.example.com 301ing to http://www.iana.org/domains/example/
  //(correct as of 27 Feb 2011)
  module.exports["Follows redirects"] = function(beforeExit){
    var ianaBody = "",
        done = false;
        
    http.get({
      host:'www.iana.org', port:80, path:'/domains/example/'
    },function(res) {
      res.setEncoding(encoding='utf8');
      
      res.on('data', function (chunk) {
        ianaBody += chunk;
      });
      
      res.on('end', function(){
        assert.response(server, {
          url:"/echo.noop/http://www.example.com/"
        },{
          body:ianaBody
        });
        done = true;
      });
    });
    beforeExit(function(){assert.ok(done);});
  };
}

