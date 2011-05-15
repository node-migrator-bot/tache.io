---
layout: default
---
#About Tache.io

Tache.io is a Node server that allows you to perform custom transformations on any remote resource. It's goal is to provide a simple-to use, simple-to-run way to convert, twist, warp, reformat and munge anything that you can access over HTTP.

It is optionally backed by a Redis caching layer allowing you to take a large traffic hit to your transformed content without hammering the original resource.

This allows you to easily provide high-availability, perfectly tailored resources in cases where you can't modify, or don't want the hassle of modifying, the original content. Some examples of uses for Tache include:

* Resize/compress images
* Scrape webpages to their core content, à la [Readability](http://code.google.com/p/arc90labs-readability/)
* Convert verbose resources & formats into lightweight wire formats
    * e.g. get just what you need from a large XML resource as a small JSON document
* Create an RSS feed from a set of webpages that don't have feeds.

## How to use Tache

You define how you want resources modified in endpoint files, written in Javascript and obeying a simple structure.

    // echo.js : by default, echo the remote content unmodified
    module.exports = {
      
      run:function(headers, content) {
        this.emit('done', content);
      },
      
      //or clean it up a bit:
      fix:{
        run:function(headers, content) {
          this.emit('done',
            content.replace(/\b([tT])eh\b/gi, '$1he')
          );
        }
      }
    }

You make an HTTP request to the endpoint's URL, followed by the full URL of the remote resource to modify

    original:
    $ curl http://example.com/original_content.txt
    Teh internetz is made of catz
    
    straightforward echo:
    $ curl http://mytacheserver/echo/http://example.com/original_content.txt
    Teh internetz is made of catz
    
    modified:
    $ curl http://mytacheserver/echo.fix/http://example.com/original_content.txt
    The internetz is made of catz

Tache first fetches the remote content specified, then passes it and its headers to the function indicated by your URL.

Your endpoint can then do whatever it likes to the content; when it's done, it emits a `done` event or calls `this.done` with the transformed content.


## More info

This site will contain full documentation for Tache.io soon. In the meantime, some more info can be found in the [project readme](https://github.com/orls/tache.io/blob/master/README.md) on github
