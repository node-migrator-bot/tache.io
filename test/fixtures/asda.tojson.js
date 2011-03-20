var jsdom = require('jsdom');

module.exports = function(content_type, data) {
  var self = this;
  
  var products = new Array();
  
  jsdom.env(data, [
    'http://code.jquery.com/jquery-1.5.min.js'
  ], function(errors, window) {
    var $ = window.$;
    
    $('.shelf .item ul').each(function() {
      //get rid of (hidden) 'Visit the product page..' span.
      $('li.productname a span', this).remove();
      products.push({
        price: $('li.price', this).first().text(),
        brand: $('li.brand a', this).first().text(),
        name: $('li.productname application ', this).first().text()
        });
    });
    self.emit('done', 'application/json', JSON.stringify(products));
  });
};

// 'Seed' the remote request with a nonsense request to get cookies stored
module.exports.env_seed = 'http://groceries.asda.com/asda-estore/search/searchcontainer.jsp?searchString=foo&domainName=Products';