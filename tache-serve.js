#!/usr/bin/env node

/*
Trivial bootstrapper to kickstart tache from the command line.

Intended for local use during development, but also 
as an example of a minimal script to get tache running.
*/


var tache = require("./"),
    sys   = require('sys'),
    fs    = require('fs'),
    path  = require('path');
    
var util  = tache.util;

var config = {},
    pwd = process.env.PWD.trim('/')+'/';

/*
USAGE:
first arg is the directory to use for tache endpoints. Tache will try to
prefix require() calls with this.
second arg is the path to a configuration file.

To pass a config file path without a special directory (e..g if you're
only using globally-installed npm modules for your endpoints) then
use - for the first arg.

*/


if (process.argv[3]) {
  try {
    var config_path = util.resolve(pwd, process.argv[3], false, util.RESOLVE_FILES_ONLY);
  } catch(e) {
    throw new Error("Unable to start Tache.io: Specified config file not found : " + e.message);
    return false;
  }
  
  try {
    config = JSON.parse(fs.readFileSync(config_path, "utf8"));
  } catch(e) {
    throw new Error("Error reading config file '" + config_path + "'" + e.message);
  }
}

if (process.argv[2] && process.argv[2] != '-') {
  try {
    var endpoint_path = util.resolve(pwd, process.argv[2], false, util.RESOLVE_DIRS_ONLY);
    config.from = {dir:endpoint_path};
  } catch(e) {
    throw new Error("Unable to start Tache.io: Specified endpoint dir not found : " + e.message);
    return false;
  }
}

tache.init(config);
