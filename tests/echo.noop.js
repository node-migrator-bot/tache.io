var Endpoint = require('tache.io').Endpoint;

module.exports = exports = new Endpoint(
  function(content_type, data) {
    var self = this;
    setTimeout(function(){
      self.emit('done', content_type, data);
    }, 1000);
});