module.exports.do = module.exports.noop = function(headers, data) {
  var self = this;
  setTimeout(function(){
    self.emit('done', headers, data);
  }, 1000);
};