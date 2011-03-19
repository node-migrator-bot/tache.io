module.exports = function(content_type, data) {
  var self = this;
  setTimeout(function(){
    self.emit('done', content_type, data);
  }, 500);
};
// 'Seed' the remote request with a nonsense request to get cookies stored
module.exports.env_seed = 'http://groceries.asda.com/asda-estore/search/searchcontainer.jsp?searchString=foo&domainName=Products';