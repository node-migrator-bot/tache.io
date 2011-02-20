
var app = {
  processRequest:function(request){
     
    var credentials = determineAuth();  //todo: define supported authentication systems
    
    var endpoint_name = credentials.autoEndpoint || request.getEndpointName();
    var target_name = resource.getTargetName();
    
    /*TODO: fast implementation of getEndpointName?
    need to get _n_ url params, see if they match a file on disk, load it up etc.
    Cache endpoint metadata in memory? support one-level deep endpoint namespaces only?
    */
    
    var endpoint = this.loadEndpoint(endpoint_name);
    
    if !credentials.valid && !endpoint.allowsAnon()
      return("403 Forbidden");
    
    var target = http.get(target_name);
    
    var result = endpoint.run(pipeName, target);
    
    if this.redis_cache.available()
      this.redis_cache.store(request.url(), result);
  },
  
  allowsAnon: function(endpoint_name){
    //STUB
  },
  
  loadEndpoint: function(name){
    //STUB
  },
}