exports.run = function(content_type, data, done) {
  setTimeout(function(){
    done(content_type, data);
  }, 1000);
};