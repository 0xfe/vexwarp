// Fix up prefixing
define(['jquery', 'dsp', 'stretch',
        'graph', 'tools', 'alertify',
        'bootstrap.slider', 'jquery.bootstrap'],
function ($, dsp, stretch, graphWidget, tools, alertify) {

WarpApp = (function() {
  var DEBUG = true;

  function L() { // Logger
    if (DEBUG) console.log(Array.prototype.slice.call(arguments).join(" "));}

  function cropAudioBuffer(ctx, buffer, start_s, end_s) {
    var sampleRate = buffer.sampleRate;
    var length = buffer.length;
    var channels = buffer.numberOfChannels;

    var start = parseInt(start_s * sampleRate);
    var end = parseInt(end_s * sampleRate);
    var newLength = end - start;
    var newBuffer = ctx.createBuffer(channels, newLength, sampleRate);
    for (var i=0; i<channels; ++i) {
      newBuffer.getChannelData(i).set(buffer.getChannelData(i).subarray(start, end));
    }

    return newBuffer;
  }

  function vexAd(elem) {
    $(elem).fadeIn(1000);
    window.setTimeout(function() {
      $(elem).fadeOut(1000);
      window.setTimeout(function() { vexAd(elem) }, 120000);
    }, 25000);
  }

  function WarpApp(options) {
    this.init(options);
  }

  WarpApp.prototype = {
    init: function(options) {
      this.options = tools.merge({}, options);
      this.$files = $("#files");
      this.$open = $("#open");

      if (!(window.AudioContext || window.webkitAudioContext)) {
        throw "No Web Audio Support"
      }

      if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        throw "No File API Support"
      }

      var AudioContext = window.AudioContext || window.webkitAudioContext;
      this.actx = new AudioContext();

      var that = this;
      document.getElementById('files')
        .addEventListener('change', function(evt) { that.loadFile(evt); }, false);
      this.$open.click(
        function() { that.$files.click()} )

      $("#play").prop("disabled", true);
      $("#play").click(function(){
        if (!that.loaded) return;
        if (that.widget.getSelection()[1] == 0) {
          alertify.error("Please select a section to stretch.")
        } else {
          that.playing = true;
          $("#play").hide();
          $("#pause").show();
          if ((that.stretchFactor != 0) || (that.pitchShift != 0)) {
            alertify.log("Warping...");
          }
          window.setTimeout(function() {
            if (!that.playing) return;
            that.stretch();
            that.play();
          }, 1000);
        }
      });

      $("#pause").click(function(){that.stop();});
      $("#loop").click(function() {
        that.loop = !that.loop;
        if (that.loop) {
          $(this).addClass("btn-success");
          $(this).removeClass("btn-danger");
          $(this).attr('title', 'Loop enabled')
            .tooltip('fixTitle').tooltip('show');
        } else {
          $(this).addClass("btn-danger");
          $(this).removeClass("btn-success");
          $(this).attr('title', 'Loop disabled')
            .tooltip('fixTitle').tooltip('show');
        }
      });

      $("#widget").tooltip();
      $("#play").tooltip();
      $(".factor").tooltip();
      $("#open").tooltip();
      $("#loop").tooltip();
      $("#speed-slider").slider({
        formater: function(val) {
          if (val == 100) {
            return "Original speed"
          } else if (val > 100) {
            return "Faster (" + val + "%)";
          } else if (val < 100) {
            return "Slower (" + val + "%)";
          }
        }
      }).on('slide', function (){
        if ($(this).slider('getValue') == 100) {
          that.stretchFactor = 1;
        } else {
          that.stretchFactor = (1 / ($(this).slider('getValue') / 100));
        }
      });

      $("#pitch-slider").slider({
        formater: function(val) {
          if (val == 0) {
            return "Original pitch";
          } else if (val > 0) {
            return val + " semitones up";
          } else if (val < 0) {
            return Math.abs(val) +" semitones down";
          }
        }
      }).on('slide', function() {
        that.pitchShift = $(this).slider('getValue');
      });

      this.widget = new graphWidget.GraphWidget("#widget");
      this.widget.create();
      this.buffer = null;
      this.playBuffer = null;
      this.fileName = "";
      this.loaded = false;
      this.stretchFactor = 1;
      this.pitchShift = 0;
      this.loop = true;
      this.playing = false;

      if (typeof chrome == "object") {
        if (typeof chrome.app.runtime == "undefined") {
          L("VexWarp running in browser. Hello world!");
            window.setTimeout(function() { vexAd("#surprise") }, 3000);
        } else {
          L("VexWarp running in app. Hello world!");
        }
      }
    },

    stretch: function() {
      var buffer = this.buffer;
      if (!buffer) return;

      var selection = this.widget.getSelection();
      var start_s = selection[0];
      var end_s = selection[1];
      var len = end_s - start_s;

      if (len == 0) {
        this.playBuffer = null;
        return;
      }

      var stretchBuffer = cropAudioBuffer(this.actx, buffer, start_s, end_s);

      if (this.stretchFactor == 1 && this.pitchShift == 0) {
        this.playBuffer = stretchBuffer;
        return;
      }

      var pitchShift = Math.pow(2, (this.pitchShift / 12));
      var totalStretchFactor = this.stretchFactor * pitchShift;
      var newSize = stretchBuffer.length * this.stretchFactor;

      L("Stretching: ", this.stretchFactor, "Shifting: ", pitchShift);

      var stretcher = new stretch.TimeStretcher({
        sampleRate: buffer.sampleRate,
        stretchFactor: totalStretchFactor
      });

      var result_buffers = [];
      var b = this.actx.createBuffer(
        stretchBuffer.numberOfChannels,
        newSize,
        stretchBuffer.sampleRate);
      for (var i = 0; i < stretchBuffer.numberOfChannels; ++i) {
        L("Stretching channel: ", i)
        stretcher.setBuffer(stretchBuffer.getChannelData(i)).stretch();
        result_buffers[i] = pitchShift ? stretcher.resize(newSize).getPitchShiftedBuffer()
                                       : stretcher.getStretchedBuffer();
        b.getChannelData(i).set(result_buffers[i]);
      }

      this.playBuffer = b;
    },

    play: function() {
      var buffer = this.playBuffer;
      if (!buffer) return;
      if (!this.playing) return;

      alertify.success("Playing...");

      var location = 0;
      var length = buffer.length;
      this.node = this.actx.createScriptProcessor(8192, 0, buffer.numberOfChannels);

      var that = this;
      var start = this.widget.getSelection()[0];
      this.node.onaudioprocess = function(evt) {
        var b = evt.outputBuffer;
        var bufsize = b.length;
        if (!that.playing) that.stop();

        for (var i = 0; i < buffer.numberOfChannels; ++i) {
          b.getChannelData(i).set(
            buffer.getChannelData(i).subarray(location, location + bufsize - 1));
        }

        that.widget.setCursor(
          start + ((location / length) * (length / buffer.sampleRate)) / that.stretchFactor);
        location += bufsize;
        if (location >= length) {
          if (that.loop) {
            location = 0;
          } else {
            that.stop();
          }
        }
      }
      // Watch out for the garbage collecter
      // http://lists.w3.org/Archives/Public/public-audio/2013JanMar/0304.html
      this.node.connect(this.actx.destination);
    },

    stop: function() {
      if (this.node) this.node.disconnect();
      $("#pause").hide();
      $("#play").show();
      this.playing = false;
      this.widget.setCursor(0);
    },

    loadFile: function(evt) {
      var files = evt.target.files;
      var reader = new FileReader();
      var that = this;

      reader.onerror = function(error) {
        alertify.error("Couldn't decode audio format.")
      }

      reader.onabort = function(e) {
        alertify.error("Load cancelled.")
      };

      reader.onloadstart = function(e) {
        alertify.log("Loading...")
      };

      reader.onloadend = function(evt) {
        alertify.log("Decoding...")
        that.actx.decodeAudioData(evt.target.result, function(b) {
          that.buffer = b;
          var spectrum = new graphWidget.Spectrum([b.getChannelData(0)]);
          this.spectrum = spectrum;
          that.widget.setSpectrum(spectrum);
          that.widget.draw();
          that.loaded = true;
          alertify.success("All ready!");
          $("#play").prop("disabled", false);
          $("#filename").text(that.fileName);
        }, reader.onerror);
      }

      for (var i = 0, f; f = files[i]; i++) {
        that.fileName = f.name;
        reader.readAsArrayBuffer(f);
      }
    }
  }

  return WarpApp;
})();


return WarpApp;
});