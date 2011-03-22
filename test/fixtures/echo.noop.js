module.exports = function(res, headers, data) {
  var self = this;
  setTimeout(function(){
    self.emit('done', headers, data);
  }, 1000);
};