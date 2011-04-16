var im      = require('imagemagick'),
    fs      = require('fs'),
    Canvas  = require('canvas'),
    Image   = Canvas.Image, 
    ccv     = require('./ccv.js'),
    crypto  = require('crypto'),
    util    = require('util');
    


    
module.exports.expects = 'binary';
module.exports.emits = 'binary';

module.exports.do = function(headers, input) {
  var self = this;
  this.response.ttl = '30s';
  
  //identify the image to get width/height
  im.identify({data:input},function(err,info){
    if (err) {
      console.log(err);
      return self.response.fail(500,"Jimmy is not happy","Imagemagick Identify issue");
    }
    var canvas = new Canvas(info.width, info.height)
      , ctx = canvas.getContext('2d')
      , tmpImg = new Image;
    
    //pass the recieved data through imagemagick to force PNG
    im.resize({
      srcData: input,
      format:'png',
      width:'100%',
    }, function(err, stdout, stderr){
      //if (err) throw err;
      
      //when the remote image has been pnged and loaded, do the ccv comp and draw the result
      tmpImg.onload = function(){
        
        try{
          ctx.drawImage(tmpImg,0,0);
        } catch(e){
          console.log(e);
        }
        console.log('running detection...');
        try{
          var comp = ccv.detect_objects({ "canvas" : ccv.grayscale(canvas),
            "interval" : 5,
            "min_neighbors" : 1 });
          
          console.log('detection finished, ' + comp.length + ' faces found');
          //If we got here, we've probably won. Set the headers, start streaming after we've drawn what we want
          
          var done = function() {
            var stream = canvas.createPNGStream();
            util.pump(stream, self.response, function(err) {
              if(err)
                console.log(err);
              self.response.end();
            });
          };
          //write the header ourself, because we'll be streaming (helper methods currently don't support streaming)
          self.response.writeHead(200, {
            "Content-Type": "image/png"
          });
          //hack for now: redraw non-grayscale img:
          ctx.drawImage(tmpImg,0,0);
          var drawJimmy = false;
          //fetch jimmy's big fat mug into another image
          if(comp.length > 0)
          {
            drawJimmy = true;
            jimmy = new Image();
            
            //from experimentation with self-application against the original jimmy pic:
            var scale = 1.4  // how much larger to make the cutout (than the bounding box width)
            
            jimmy.onload = function() {
              
              for (var i = 0; i < comp.length; i++)
              {
                console.log('drawing face '+i);
                faceData = comp[i];
                
                var width = faceData.width * scale,
                    height = faceData.width * scale * (jimmy.height / jimmy.width);
                //the box returned by the CVV routine is always square,
                //but for strict scaling correctness I base it all on one measurement (width), and figure out
                //the height based on the cutout's original w/h ratio
                
                ctx.drawImage(jimmy,
                  faceData.x + (faceData.width / 2) - (width / 2),
                  faceData.y + (faceData.height / 2) - (height /2),
                  width, height
                  );
                console.log('drawn face '+i);
              }
              done();
            };
            //load the jimmy overlay img.
            jimmy.src = __dirname + "/jimmy_overlay.png";
            
          }
          
          if(!drawJimmy) done();
            
        } catch(e) {
          console.log(e);
          self.response.fail(500,"Jimmy is not happy", "CCV failure");
        }
      };
      
      try
      {
        //load the newly-forced PNG straight into the image elem
        tmpImg.pngData = stdout;
      } catch(e) {
        console.log(e);
        self.response.fail(500,"Jimmy is not happy", "CCV failure");
      }
      
    });
  });
};

