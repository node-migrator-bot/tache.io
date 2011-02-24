/*
Trivial bootstrapper to kickstart tache with a
config file specified on the command line.

Intended for local use during development, but also 
as an example of a minimal script to get tache running.
*/

var tache = require("tache.io");

var server = tache.init(process.argv[2]);
