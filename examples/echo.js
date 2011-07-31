module.exports = {
  run: function(headers, body){
    this.headers = headers;
    this.emit('done', body);
  },
  delay:{
    run: function(headers, body){
      var self = this;
      setTimeout(function(){
        self.headers = headers;
        self.emit('done', body);
      }, 1000);
    }
  },
  caps:{
    run: function(headers, body){
      this.headers = headers;
      this.emit('done', body.toUpperCase());
    }
  }
};