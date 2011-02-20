# Tache.io
## The Transformation Cache server.

Tache.io is an on-demand web spider and data munger. It is a NodeJS-powered, Redis-backed server for applying transformations on remote content, with cached results.

Tache.io enables remote clients (e.g. mobile apps) to receive Web resource in an altered fashion, without having to repeatedly munge data at the client end or alter the original web resources. It shoulders the burden of transforming data into lightweight representations and provides mass-availability, while keeping the original publishing server happily untouched and allowing for simple client processing.

## Usage

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

## Current status

At present, Tache.io is just this readme file. Feel free to fork this project and help me build it. Suggestions and comments are always welcome; just add a feature request issue at https://github.com/orls/Tache.io/issues

## Some thoughts and notes

* Service access architecture options:
    * Always POST: resource is returned
        * Not very correct RESTfully. Pain the arse for client to implement?
    * Try to GET, POST if not found. POST will return information about the newly created resource (`201 Created` status code, with `Location` header)
        * most correct behaviour, but increases pain on the client's end:
            * `GET /pipeline/target`
            * If 404, `POST /pipeline` with target in body
            * Wait for reply and follow the location header on `201 Created` reply
            * More of a hassle to write code for than simply fire-and-forget
    * Always GET with target URL appended
        * e.g. GET /mypipe/subpipe/http://www.example.com/foo
        * Feels a bit wrong having an HTTP url tacked on the end, but semi-legit.
        * This behaviour becomes more like a (very nontransparent) proxy
* Actually, that's an idea...
    * Implement a full proxy mode? Clients attach the desired pipeline as a header.
    * Could auto-select pipeline based on security credentials too
    * If no pipeline specified/eligible, service just doesn't respond.
    * Reduces management ability -- e.g forcing cache to clear, etc.
