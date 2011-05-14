var http   = require('http'),
    tache  = require("../"),
    //tache  = require("../coverage/"),
    assert = require('assert');

var server = tache.init({
      cache:{
        "enabled":false
      },
      from:{
        dir:tache.util.resolve(process.env.PWD.trim('/'), 'examples', false, tache.util.RESOLVE_DIR_ONLY)
      }
    }, false);

var offlineOnly = (process.argv[2] == "offline");

//TODO: would be nice to have these in a config somewhere, available globally and called by key
// (like an internationalization file). Would avoid having to duplicate them exactly here.
var responses = {
  bad_endpoint:"The required endpoint was not found or is unavailable\n"
};

module.exports = {
  "Unknown endpoints 404":function(beforeExit){
    var done = 0;
    var endpoints = ['a',
    'a/b',
    'a/b/c/d',
    'a/b/c.d',
    'a-b-c',
    'a_b_c',
    'a-b-c.d',
    'a/b-c.d',
    'a/b_c.d',
    'a/b_c.d.e',
    'a/b_c.d_e',
    'a.b'];
    
    endpoints.forEach(function(endpoint){
      assert.response(server,
        { url:'/' + endpoint + "/http://www.example.com"},
        { body:responses.bad_endpoint },
        function(){ done++; }
      );
    });
    
    beforeExit(function() {assert.equal(done, endpoints.length);});
  },

  "Bad endpoint names rejected":function(beforeExit){
    var done = 0;
    var endpoints = ['a.b/c',
    'a..b'];
    
    endpoints.forEach(function(endpoint){
      assert.response(server,
        { url:'/' + endpoint + "/http://www.example.com"},
        { status:501 },
        function(){ done++; }
      );
    });
    
    beforeExit(function() {assert.equal(done, endpoints.length);});
  },
  
  "Broken endpoint 404":function(){
    assert.response(server, {
      url:"/broken/http://www.example.com"
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
    
    testServer.listen(3001);
    
    assert.response(server, {
      url:"/echo/http://127.0.0.1:3001/"
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
          url:"/echo/http://www.example.com/"
        },{
          body:ianaBody
        });
        done = true;
      });
    });
    beforeExit(function(){assert.ok(done);});
  };
  
  module.exports["Cookie-needing remote site seeded"] = function(){
    assert.response(server, {
      url:"/seeded/http://groceries.asda.com/asda-estore/search/searchlayout.jsp?searchString=bread&domainName=&pageConfiguration=8100012&fromContainer=yes&headerVersion=",
      headers:{'x-tache-nocache':'true'} //clear out the cache -- multiple frequent test runs agains the same redis sever will have some other value stored
    },function(res){
      assert.includes(res.body, '<strong>bread</strong>');
      assert.includes(res.body, '<div class="productsdisplay">');
      assert.includes(res.body, '<div class="item"');
    });
  };
}

