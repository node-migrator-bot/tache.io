module.exports = {
  run: function(headers, body){
    this.emit('done', headers, body);
  },
  delay:{
    run: function(headers, body){
      var self = this;
      setTimeout(function(){
        self.emit('done', headers, body);
      }, 1000);
    }
  },
  caps:{
    run: function(headers, body){
      this.emit('done', headers, body.toUpperCase());
    }
  }
};