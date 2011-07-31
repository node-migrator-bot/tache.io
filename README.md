# Tache.io
## The Transformation Cache server.

Tache.io is an on-demand web data munger. It is a NodeJS-powered, Redis-backed server for applying transformations on remote content, with cached results. Think of it as a [Translucent Intercepting Proxy](http://blog.lagentz.com/nodejs/translucent-intercepting-proxy-built-with-nodejs-tip-js/).

Tache.io enables remote clients (e.g. mobile apps) to receive Web resource in an altered fashion, without having to repeatedly munge data at the client end or having to alter the original web resources. It shoulders the burden of transforming data into lightweight representations and provides mass-availability, while keeping the original publishing server happily untouched and allowing for simple client processing.

## Overview

All client-facing functionality in Tache.io is grouped into *endpoints* that you write for specific purposes.

Simply make an HTTP `GET` request to your endpoint's name followed by the URL of the resource you want to transform., e.g. `GET /my-endpoint/http://example.com`. The URL given can be any resource that the Tache.io server can retrieve over HTTP -- this could be content on the public web, resources inside your network, etc.

Endpoints are given the remote content that the end-user specified, then transform it and emit a response.

Some examples of actions that your endpoints could perform:

* Resize/compress images
* Scrape webpages to core-content form, à la [Readability](http://code.google.com/p/arc90labs-readability/)
* Convert verbose resources & formats into lightweight over-the-wire formats
    * e.g. get just what you need from a large XML resource as a small JSON document

You can also specify the endpoint as an additional header named `Tache-endpoint`, and omit it from the request URL, e.g.

    GET /http://example.com
    Tache-endpoint: my-endpoint

Tache.io will fetch the request specified by the URL, following redirects (actually any 3xx HTTP response codes), pass it to your endpoint function, and output the result to the client. It'll also store a cache of the result on the server, ready for quick retrieval later.

## Usage

Make sure you have all the prerequisites:

* [Node](http://nodejs.org/) (tested on 0.4.0 +)
* [npm](http://npmjs.org/)
* A [Redis](http://redis.io/) server to connect to (optional)


### In your own project

Install using npm:

    npm install tache.io

Somewhere in your project, do the following;

    var tache = require('tache.io').init();
    
    tache.tachify(
      "my/endpoint/class.method",
      "http://www.example.com"
      function(err, response) {
        console.log(
          response.headers,
          response.body
          )
      }
    );

### Standalone

Tache.io ships with a simple shell script `tache-serve` that allows you start a local tache server just by pointing it at a directory of endpoints.

    tache-serve [endpoint_directory | -] [config_file]

__Important__: If you're using npm 1.0+  you'll need to `npm install -g tache.io` (to install globally) before you can run standalone tache. If you're not using NPM 1.0+, you should be.

---

Both of these will, by default, start Tache.io with local configuration: it will listen for requests on localhost:8000 and look for a redis server on 127.0.0.1:6379.

## How to write endpoints

For compatibility with the [Node require() stack](http://nodejs.org/docs/v0.4.5/api/modules.html#modules) and with npm, endpoints are stored anywhere that require() can see them.

You can install endpoints with npm; for endpoints not published on search.npmjs.org, you can either...

* keep them outside of your project, add npm metadata, then use npm to install them 'locally' into your project
* just copy/link them into your project's `node_modules` directory.

Endpoint files should have the same filename, or module name, as you want to use in the URL when invoking them.

For example, if you want to provide an endpoint that is accessed at `http://myserver/munge/http://example.com`, then in `myproject/node_modules` you can either add a single file called `munge.js`, or add a directory called `munge` containing a package.json file, or anything else that can be read by `require()`.

Endpoints should export an object with the property `run`. This is the endpoint's core function.

Endpoint functions receive two parameters; the headers from the remote resource in question, and the body of the remote resource.

For example, given the following code in `node_modules/echo.js`:

    // echo the remote content unmodified
    module.exports = {
      
      run: function(headers, body){
        this.emit('done', headers, body);
      }
    };

Then a request to `http://myserver/echo/http://www.example.com` will simply return http://www.example.com's body content.

### Nesting

Endpoints can contain other endpoints as additional properties. nested endpoints are invoked with the 'parent' name, a period, and the nested name. For example, we can enhance the above endpoint as follows:

    // echo the remote content unmodified
    module.exports = {
      
      run: function(headers, body){
        this.emit('done', headers, body);
      }
      
      fix: function(headers, body){
        this.emit('done', headers, body.replace(/\b([tT])eh\b/gi, '$1he'));
      }
      
    };

A request to `http://myserver/echo.fix/http://www.example.com` will now return it with any instances of 'teh' corrected to 'the'.

## Tweaking endpoint behaviours

Endpoints can optionally have an property named `meta`, which is a hash of values that affect how parts of the tache lifecycle behave.

The valid values at present are:

* `expects`: the encoding to use when reading remote requests, before they're fed to your `run` function (default:`utf8`).
* `emits`: the encoding to be used when writing your data back to the HTTP response (default:`utf8`).
* `seed`: If the remote resources that your endpoint is intended for require cookies to be set, you can specify a 'seed' URL to be requested in advance (default:`false`). 
* `ttl`: This allows endpoints to specify cache time-to-live using the same time period format as the main cache configuration (default:`1h`). *NOTE: not currently used* 

See the [node documentation](http://nodejs.org/docs/v0.4.7/api/all.html#buffers) for more information about encodings.

Endpoints inherit the default values above. Nested endpoints inherit the values of their parents, unless they specify overrides.

## Current status

Tache currently supports a very open/freeform endpoint function structure. It does process requests end to end, but much of the API is open to change.

Feel free to fork this project and help me build it. Suggestions and comments are always welcome; just add a feature request issue at https://github.com/orls/tache.io/issues

## Building and testing

To hack on Tache.io itself, clone this repository to somewhere on your machine.

    cd ~/
    git clone https://github.com/orls/tache.io.git
    cd tache.io/

Testing is performed with the excellent [Expresso](http://visionmedia.github.com/expresso/)

    cd tache.io/
    npm install expresso
    expresso

## Related projects

* [Node.io](http://node.io/) has some similar goals -- simple-to-write content transformations -- but a very different architecture focused less on remote resources.
* Tache was conceived around the same time as [tip.js -- Translucent Intercepting Proxy](http://blog.lagentz.com/nodejs/translucent-intercepting-proxy-built-with-nodejs-tip-js/) and shares some of the goals and concepts.

## Shoulders of giants

Tache relies on the [Connect](http://senchalabs.github.com/connect/) middleware for HTTP server boilerplate and to impose some structure. It will, in future, make more extensive use of Connect  and will play nicely as part of your own Connect middleware stack.

Much thanks to the [node_redis](https://github.com/mranney/node_redis/) and [validator](https://github.com/chriso/node-validator) libs.

## Some thoughts and notes

### Roadmap and desireables

* Plugin/modular cache support (to encourage other cache backends)
* Other request styles, e.g. `?url=` param
* Endpoint status/meta responses
* HTTP authentication
* SSL w/client certificate authentication
* Management interface
    * Enable/disable endpoints
    * Aliases to endpoints?
        * take better advantage of the connect middleware
    * credentials mgmt
    * Total cache sizes
    * time to live
    * selective cache cleardown tools
* Optionally log events to remote analytics services.
* Possibly operate in a 'fuller' proxy mode (more transparent)
  * server-side endpoint choosing, so the tache server can be configured as an HTTP proxy and no URL choosing is needed on the client.


## License

Copyright (c) 2011 Owen Smith. Licensed under the [MIT License](http://www.opensource.org/licenses/mit-license.php)