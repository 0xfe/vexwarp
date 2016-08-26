/*
  Vex.DSP - Signal Processing Libraries for VexFlow
  Copyright 2014 Mohit Cheppudira.

  STFT, Phase Vocoder implementations.
*/

define(['jquery', 'dsp', 'tools'],
function($, dsp, tools) {

var DSP = dsp.DSP;
var FFT = dsp.FFT;
var WindowFunction = dsp.WindowFunction;

var Spectrum = (function() {
  var DEBUG = true;

  function L() { // Logger
    if (DEBUG) console.log(Array.prototype.slice.call(arguments).join(" "));}


  function Spectrum(buffers, options) {
    this.init(buffers, options);
  }

  hanning = new WindowFunction(DSP.HANN);

  Spectrum.calculatePeaks = function(buffer) {
    var hi_peak = 0;
    var lo_peak = 0;
    for (var i=0; i<buffer.length; ++i) {
      var val = buffer[i];
      if ((val > 0) && (val > hi_peak)) hi_peak = val;
      if ((val < 0) && (val < lo_peak)) lo_peak = val;
    }
    return [lo_peak, hi_peak];
  }

  Spectrum.prototype = {
    init: function(buffers, options) {
      this.options = {
        fftSize: 256,
        frameSize: 8192,
        sampleRate: 44100
      }

      this.buffers = buffers;
      tools.merge(this.options, options);
    },

    getSampleNumber: function(time_s) {
      return parseInt(time_s * this.options.sampleRate);
    },

    getBuffer: function(channel, start_s, len_s) {
      if (!start_s)
        return this.buffers[channel];

      var total_samples = this.buffers[channel].length;
      var start_sample = this.getSampleNumber(start_s);
      var num_samples =
        (len_s > 0) ? this.getSampleNumber(len_s) : (total_samples - start_sample);

      L("getBuffer: ", start_sample, num_samples);

      return this.buffers[channel].subarray(start_sample, start_sample + num_samples);
    },

    getNumFrames: function(channel) {
      return Math.ceil(buffers[channel].length / frameSize);
    },

    getNumChannels: function() {
      return this.buffers.length;
    },

    getFrameBuffer: function(channel, frame) {
      return this.buffers[channel].subarray(frame * frameSize, (frame * frameSize) + frameSize);
    },

    getLengthSeconds: function() {
      return this.buffers[0].length / this.options.sampleRate;
    },

    plot: function(context, width, height, channel, start_s, len_s) {
      var buffer = this.getBuffer(channel, start_s, len_s);
      var peaks = Spectrum.calculatePeaks(buffer);

      var y_height = height;
      var y_center = y_height / 2;

      var x = 0;
      for (var i=0; i < buffer.length; i += parseInt((buffer.length / width)) * 2) {
        tools.onProgress({total_stages: 0, current_window: i, total_windows: buffer.length},
          "Plot: ");
        var val = buffer[i];
        if (val > 0) {
          context.fillRect(x, y_center, 2, (val / peaks[1]) * y_center);
        } else if (val < 0) {
          context.fillRect(x, y_center, 2, (val / peaks[0]) * -y_center);
        }
        x += 2;
      }
      tools.onProgress({complete: true}, "Plot: ");
      return this;
    }
  }

  return Spectrum;
})()

var GraphWidget = (function() {
  var DEBUG = true;

  function L() { // Logger
    if (DEBUG) console.log(Array.prototype.slice.call(arguments).join(" "));}

  function GraphWidget(elem, spectrum, options) {
    this.init(elem, options);
  }

  hanning = new WindowFunction(DSP.HANN);

  GraphWidget.prototype = {
    init: function(elem, options) {
      this.options = {
        num_bins: 128, // Number of frequency bins (power of 2)
        sampleRate: 44100,
        start_s: 0,          // Start time
        length_s: -1,        // -1 for whole buffer
        width: 700,
        height: 128
      }

      tools.merge(this.options, options);

      this.spectrum = null;
      this.elem = elem;
      this.mousedown = false;
      this.selected = false;
      this.selection_start = 0;
      this.selection_end = 0;
      return this;
    },

    getSelection: function(spectrum) {
      return [this.selection_start, this.selection_end];
    },

    setSpectrum: function(spectrum) {
      this.spectrum = spectrum;
      this.mousedown = false;
      this.selected = false;
      this.selection_start = 0;
      this.selection_end = 0;
      this.updateMarkers();
      return this;
    },

    setCursor: function(seconds) {
      var rect = this.ctx_play_cursor.canvas.getBoundingClientRect();
      var length = this.spectrum ? this.spectrum.getLengthSeconds() : 0;

      var x = (seconds / length) * this.options.width;

      this.ctx_play_cursor.clearRect(0, 0, this.options.width, this.options.height);
      this.ctx_play_cursor.fillRect(x, 0,
                               2, this.options.height);
    },

    updateCursor: function(evt) {
      var rect = this.ctx_cursor.canvas.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;

      this.ctx_cursor.clearRect(0, 0, this.options.width, this.options.height);
      this.ctx_cursor.fillRect(x, 0,
                               2, this.options.height);

      if (this.spectrum) {
        this.$current_seconds.text(
          tools.prettyTime((x / this.options.width) * this.spectrum.getLengthSeconds()))
      }
    },

    onMouseMove: function(evt) {
      if (this.mousedown && this.spectrum) {
        var rect = this.ctx_top.canvas.getBoundingClientRect();
        var x = evt.clientX - rect.left;
        var y = evt.clientY - rect.top;

        this.ctx_top.clearRect(0, 0, this.options.width, this.options.height);
        this.ctx_top.fillRect(this.selected_x, 0,
                              x - this.selected_x, this.options.height);
        this.selected = true;
      }
    },

    onMouseDown: function(evt) {
      var rect = this.ctx_top.canvas.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;

      if (x < 0) x = 0;
      if (x > this.options.width) x = this.options.width
      this.mousedown = true;
      this.selected_x = x;
      this.selected = false;
      this.ctx_top.clearRect(0, 0, this.options.width, this.options.height);
    },

    onMouseUp: function(evt) {
      var rect = this.ctx_top.canvas.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;

      if (x < 0) x = 0;
      if (x > this.options.width) x = this.options.width;
      if (this.selected) {
        this.selected = false;
        this.selection = [this.selected_x, x];
        var length = this.spectrum.getLengthSeconds();
        var start_time = (this.selected_x  / this.options.width) * length;
        var end_time = (x  / this.options.width) * length;

        // Swap start and end times incase of reverse selection
        if (start_time > end_time) {
          this.selection_end = start_time;
          this.selection_start = end_time;
        } else {
          this.selection_end = end_time;
          this.selection_start = start_time;
        }

        this.$selected_seconds.text(
          "(" + tools.prettyTime(this.selection_end - this.selection_start) + ")"
        );
      } else {
        if (this.mousedown) {
          this.$selected_seconds.text("");
          this.selection_start = 0;
          this.selection_end = 0;
        }
      }

      this.mousedown = false;
    },

    drawMarkers: function() {
      var midpoint = this.options.height / 2;
      this.ctx_marker.clearRect(0, 0, this.options.width, this.options.height);
      this.ctx_marker.fillRect(0, midpoint, this.options.width, 1);


      this.ctx_marker.fillRect(0, this.options.height - 1, this.options.width, 1);
      var i = 0;
      for (var x = 0; x < this.options.width; x += (this.options.width / 100)) {
        var height = (i++ % 10) == 0 ? -10 : -5;
        this.ctx_marker.fillRect(x, this.options.height, 1, height);
      }

      this.ctx_marker.fillRect(0, this.options.height, 1, -10);
      this.ctx_marker.fillRect(this.options.width-1, this.options.height, 1, -10);
    },

    updateMarkers: function() {
      var midpoint = this.options.height / 2;
      this.drawMarkers();
      if (this.spectrum) {
        /*
        var length = this.spectrum.getLengthSeconds();
        this.ctx_marker.fillText(tools.prettyTime(length),
          this.options.width - 50, 10);
        */
      }
    },

    create: function() {
      $(this.elem).css("position", "relative");
      $(this.elem).css("text-align", "center");
      var canvas_base = $("<canvas/>")
        .width(this.options.width)
        .height(this.options.height)
        .attr("width",this.options.width)
        .attr("height",this.options.height)
        .css("position", "absolute")
        .css("left", "0")
        .css("top", "0")
        .css("z-index", "0");

      var canvas_marker = $("<canvas/>")
        .width(this.options.width)
        .height(this.options.height)
        .attr("width",this.options.width)
        .attr("height",this.options.height)
        .css("position", "absolute")
        .css("left", "0")
        .css("top", "0")
        .css("z-index", "2");

      var canvas_top = $("<canvas/>")
        .width(this.options.width)
        .height(this.options.height)
        .attr("width",this.options.width)
        .attr("height",this.options.height)
        .css("position", "absolute")
        .css("left", "0")
        .css("top", "0")
        .css("z-index", "10");

      var canvas_cursor = $("<canvas/>")
        .width(this.options.width)
        .height(this.options.height)
        .attr("width",this.options.width)
        .attr("height",this.options.height)
        .css("position", "absolute")
        .css("left", "0")
        .css("top", "0")
        .css("z-index", "1");

      var canvas_play_cursor = $("<canvas/>")
        .width(this.options.width)
        .height(this.options.height)
        .attr("width",this.options.width)
        .attr("height",this.options.height)
        .css("position", "absolute")
        .css("left", "0")
        .css("top", "0")
        .css("z-index", "1");

      $(this.elem).append(canvas_base);
      $(this.elem).append(canvas_marker);
      $(this.elem).append(canvas_top);
      $(this.elem).append(canvas_cursor);
      $(this.elem).append(canvas_play_cursor);
      $(this.elem).append(
        $('<div/>')
          .width(this.options.width)
          .height(this.options.height))

      this.$current_seconds = $('<span/>')
        .css('color', "green");
      this.$total_seconds = $('<span/>')
        .css('padding-left', "10px");
      this.$selected_seconds = $('<span/>')
        .css('padding-left', "10px")
        .css('color', "blue");

      $(this.elem).append(
        $('<div/>').append(this.$current_seconds)
                   .append(this.$selected_seconds)
                   .append(this.$total_seconds));

      this.ctx_spectrum = canvas_base.get(0).getContext('2d');
      this.ctx_spectrum.fillStyle = "rgb(200,90,90)";
      this.ctx_spectrum.strokeWidth = 0;

      this.ctx_top = canvas_top.get(0).getContext('2d');
      this.ctx_top.fillStyle = "rgba(150,150,255,0.40)";
      this.ctx_top.strokeWidth = 0;

      this.ctx_cursor = canvas_cursor.get(0).getContext('2d');
      this.ctx_cursor.fillStyle = "rgba(60,60,90,0.80)";
      this.ctx_cursor.strokeWidth = 0;

      this.ctx_marker = canvas_marker.get(0).getContext('2d');
      this.ctx_marker.fillStyle = "rgb(20,20,120)";
      this.ctx_marker.font = "12px Arial";
      this.ctx_marker.strokeWidth = 0;

      this.ctx_play_cursor = canvas_play_cursor.get(0).getContext('2d');
      this.ctx_play_cursor.fillStyle = "rgba(180,40,40,0.70)";
      this.ctx_play_cursor.strokeWidth = 0;

      this.drawMarkers();
      this.updateMarkers();

      var that = this;
      canvas_top.on('mousedown', function(evt) { that.onMouseDown(evt) })
      canvas_top.mousemove(function(evt) { that.updateCursor(evt)});
      $(window).on('mousemove', function(evt) { that.onMouseMove(evt) })
      $(window).on('mouseup', function(evt)   { that.onMouseUp(evt) })
      return this;
    },

    draw: function() {
      this.ctx_spectrum.clearRect(0, 0, this.ctx_spectrum.canvas.width,
                                        this.ctx_spectrum.canvas.height);
      this.spectrum.plot(
        this.ctx_spectrum, this.options.width, this.options.height,
        0, this.options.start_s, this.options.length_s);
      return this;
    }
  }

  return GraphWidget;
})()

return {Spectrum: Spectrum, GraphWidget: GraphWidget};
});