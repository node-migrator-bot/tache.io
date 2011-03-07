# Tache.io
## The Transformation Cache server.

Tache.io is an on-demand web data munger. It is a NodeJS-powered, Redis-backed server for applying transformations on remote content, with cached results.

Tache.io enables remote clients (e.g. mobile apps) to receive Web resource in an altered fashion, without having to repeatedly munge data at the client end or alter the original web resources. It shoulders the burden of transforming data into lightweight representations and provides mass-availability, while keeping the original publishing server happily untouched and allowing for simple client processing.

## Overview

All client-facing functionality in Tache.io is grouped into *endpoints* that you write for specific purposes.

Endpoints specify one or more *transformations* to run against a URL.

Transformations are small, reusable code chunks that can do anything they like to the received data. Some examples of actions you could take:

* Resize/compress images
* Scrape webpages to core-content form, à la [Readability](http://code.google.com/p/arc90labs-readability/)
* Convert verbose resources & formats into lightweight over-the-wire formats
    * e.g. get just what you need from a large XML resource as a small JSON document

Simply make an HTTP `GET` request to your endpoint's name followed by the URL of the resource you want to transform., e.g. `GET /my.pipe/http://example.com`. The URL given can be any resource that the Tache.io server can retrieve over HTTP -- this could be content on the public web, resources inside your network, etc.

You can also specify the endpoint as an additional header named `Tache-endpoint`, and omit it from the request URL, e.g.

    GET /http://example.com
    Tache-endpoint: my.pipeline

Tache.io will fetch the request specified by the URL, pass it through each transformation job in turn, and output the result to the client. It'll also store a cache of the result on the server, ready for quick retrieval later.

## Usage

Make sure you have all the prerequisites:

* [Node](http://nodejs.org/) (tested on 0.4.0 +)
* [npm](http://npmjs.org/)
* [Redis](http://redis.io/)

Clone this repository to somewhere on your machine

    cd ~/
    git clone https://github.com/orls/tache.io.git
    cd tache.io/

Link the tache.io package (note: this will not be required soon, once tache is released as a proper npm package)

    npm link tache.io/

Run tache:

    node start-tache.js

This will start Tache.io with default configuration: it will listen for requests on localhost:8000 and look for a redis server on 127.0.0.1:6379.

## Current status

Tache.io currently supports crude Endpoints that can be any code you like (for now). It supports simple Redis caching.

Feel free to fork this project and help me build it. Suggestions and comments are always welcome; just add a feature request issue at https://github.com/orls/tache.io/issues

## Building and testing

Testing is performed with the excellent [Expresso](http://visionmedia.github.com/expresso/)

  npm install expresso
  expresso test/server-tests.js

## Some thoughts and notes

### Roadmap and desireables

* Plugin/modular cache support (to encourage other cache backends)
* Other request styles, e.g. `?url=` param
* Endpoint status/meta responses
* HTTP authentication
* SSL w/client certificate authentication
* Management interface
    * Enable/disable endpoints
    * credentials mgmt
    * Total cache sizes
    * time to live
    * selective cache cleardown tools
* Optionally log events to remote analytics services.