module.exports = {
  run: function(headers, data){
    var self = this;
    setTimeout(function(){
      self.headers = headers;
      self.emit('done', data);
    }, 500);
  },
  meta:{
    // 'Seed' the remote request with a nonsense request to get cookies stored
    seed:'http://groceries.asda.com/asda-estore/search/searchcontainer.jsp?searchString=foo&domainName=Products'
  }
}
