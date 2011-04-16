var im = require('imagemagick'),
    fs = require('fs');
    
module.exports.expects = 'binary';
module.exports.emits = 'binary';

module.exports.flip = function(headers, data) {
  var self = this;
  this.response.ttl = '30s';
  this.response.type = headers['Content-type'] || 'image/jpeg';
  
  im.resize({
    srcData: data,
    width:'100%',
    customArgs:['-flip']
  }, function(err, stdout, stderr){
    if (err) throw err
    self.reply(stdout);
  });
};

