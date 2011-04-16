/*
Trivial bootstrapper to kickstart tache with a
config file specified on the command line.

Intended for local use during development, but also 
as an example of a minimal script to get tache running.
*/

var tache = require("tache.io");

tache.init({
  "cache":{
    "ttl":"1m",
    "redis":{
      "host":"127.0.0.1",
      "port":"6379"
    }
  }
});
