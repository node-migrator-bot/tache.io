
var app = {
  processRequest:function(request){
     
    var credentials = determineAuth();  //todo: define supported authentication systems
    
    var pipe_name = credentials.autoPipe || request.getPipeName();
    var target_name = resource.getTargetName();
    
      /*TODO: fast implementation of getPipeName?
      need to get _n_ url params, see if they match a file on disk, load it up etc.
      Cache pipeline metadata in memory? support one-level deep pipeline namespaces only?
      */
    
    var pipe = this.loadPipe(pipeName);
    
    if !credentials.valid && !pipe.allowsAnon()
      return("403 Forbidden");
    
    var target = http.get(target_name);
    
    var result = pipe.run(pipeName, target);
    
    if this.redis_cache.available()
      this.redis_cache.store(request.url(), result);
  },
  
  allowsAnon: function(pipeName){
    //STUB
  },
  
  loadPipe: function(pipeName, input){
    //STUB
  },
}