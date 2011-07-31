var http  = require('http'),
    https = require('https'),
    sys   = require('sys'),
    fs    = require('fs'),
    path  = require('path'),
    url   = require('url'),
    assert = require('assert');

var check    = require('validator').check,
    sanitize = require('validator').sanitize;

var util = exports.util = require('./util');


var _respond = function(response, status, reasonPhrase, headers, body, after){
  headers['Content-Length'] = Buffer.byteLength(body, response.encoding);
  response.writeHead(status, headers);
  response.end(body,response.encoding);

  if (after) after();
}


/*
Once initialised by tache (which passes itself through)
set up Connect middlewares to be injected to the server.
This will allow, for example, a different preparation function
to be passed in in proxy-mode, etc.
*/

module.exports = exports = function(config, tachify) {
  
  
  return {
    prepare:function(request, response, next){

      //bind some functions in to context
      //TODO: set up a top-level response timeout just in case everything blows up?
      request.fail  = response.fail = function(status,reason,msg,exception){
        _respond(response,status,reason,'text-plain',msg+'\n',function(){
          console.log("Rejecting request to " + request.url + ' : ' + msg);
          //if(exception) console.log('Request failed due to error:\n'+ exception.stack);
        });};
      request.reply = response.reply = function(headers, body, after){
        _respond(response,200,"OK",headers, body, after);
      };

      //break request URI at the slash between the endpoint name and a URI protocol.
      //(if there's a URI after the endpoint, the slash between is removed here)
      var uri_parts = request.url
        .split(/\/(?=\w+:\/\/)/,2);   //FIXME -- broken!

      /* uri_parts will be one of:
        ["", target_uri]
        [endpoint_name, target_uri]
        [endpoint_name]
        [endpoint_name/]
      */

      //TODO: improve input escaping
      var endpoint_name = sanitize(uri_parts[0] || request.headers['tache-endpoint'])
          .trim('^A-Za-z0-9')   //trim non-word chars from ends
          .replace(/\/+/,'/');  //remove multiple instances of slashes
      var target_url = sanitize(uri_parts[1])
          .ltrim('/')


      //TODO: if no url, treat requests like 
      //a HEAD request to the endpoint and return meta info
      try {
        check(endpoint_name).regex(/^([\w-_]+\/)*([\w-_]+\.)?([\w-_]+\.?)*$/); //ensure enpoint is of the form foo, foo.bar, foo/bar.baz, foo/bar/baz.quux etc
      } catch (e) {
        return request.fail(501, "Not Supported",
          "Invalid endpoint name form",e);
      }
      //if no URI specified (could happen with direct requests to root and an endpoint header)
      //TODO: node-validator only accepts http, https, ftp. Do i need to support more?
      try {
        check(target_url).isUrl();
      } catch (e) {
        return request.fail(404, "Not Found",
          "Target URL not specified, or invalid",e);
      }

      //Bind in the actual processing trigger, appropriate errors etc

      request.endpoint = endpoint_name;
      request.target = target_url;

      next();
      
    },
    handle: function(request, response){
        
        tachify( request.endpoint, request.target,
          function(err, tached) {
            if(err){
              console.log("Oh Noes!")
              return response.fail(err.code, err.message, err.detail, err.exeption);
            }
            
            response.reply(tached.headers, tached.body);
          }
        );
      }
    };
  
};

