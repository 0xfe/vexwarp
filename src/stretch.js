/*
  Vex.DSP - Signal Processing Libraries for VexFlow
  Copyright 2014 Mohit Cheppudira.

  STFT, Phase Vocoder implementations.
*/

define(['dsp', 'tools'],
function(dsp, tools) {

var TimeStretcher = (function() {
  var DEBUG = true;
  var DSP = dsp.DSP;
  var FFT = dsp.FFT;
  var WindowFunction = dsp.WindowFunction;

  function L() { // Logger
    if (DEBUG) console.log(Array.prototype.slice.call(arguments).join(" "));}

  function TimeStretcher(options) {
    this.init(options);
  }

  function onProgress(details, message) {
    if (!message) message = "";
    tools.onProgress(details, message);
  }

  function phase(fft, bin) {
    return Math.atan2(fft.imag[bin], fft.real[bin]);
  }

  TimeStretcher.prototype = {
    init: function(options) {
      this.options = {
        vocode: false,            // Enable Phase Vocoder
        stftBins: 8192,           // Number of bins used by FFT
        stftHop: 1/4,             // Hop size for STFT (25%)
        stretchFactor: 1.5,       // Stretch factor (1.5x)
        sampleRate: 44100,        // PCM sample rate (44KHz)
        progressCallback: onProgress
      }

      tools.merge(this.options, options);
      this.stretched_buffer = null;
      this.resampled_buffer = null;
      return this;
    },

    setBuffer: function(buffer, sampleRate) {
      this.buffer = buffer;
      this.stretched_buffer = null;
      this.resampled_buffer = null;
      if (sampleRate) this.options.sampleRate = sampleRate;
      return this;
    },

    getBuffer: function() {
      return this.buffer;
    },

    getStretchFactor: function() {
      return this.options.stretchFactor;
    },

    getStretchedBuffer: function() {
      return this.stretched_buffer;
    },

    getPitchShiftedBuffer: function() {
      return this.resampled_buffer;
    },

    getOptions: function() {
      return this.options;
    },

    stretch: function() {
      if (!this.buffer) {
        throw "Error: TimeStretcher.setBuffer() must be called before stretch()"
      }

      if (this.stretched_buffer) return this.stretched_buffer;

      var that = this;
      function progress(stage, window, total_windows, complete) {
        that.options.progressCallback({
          current_stage: stage,
          total_stages: 2,
          current_window: window,
          total_windows: total_windows,
          complete: (complete == true)
        }, "Time Stretching: ")
      }

      var points = this.options.stftBins;
      var vocode = this.options.vocode;
      var hop = parseInt(points * this.options.stftHop);
      var hop_synthesis = parseInt(hop * this.options.stretchFactor);
      var freq = this.options.sampleRate;
      var data = this.buffer;

      var t = 1 / freq;
      var length = data.length;
      var hanning = new WindowFunction(DSP.HANN);
      var stretch_amount = this.options.stretchFactor;

      L("Starting time stretch ("+ (stretch_amount) +"x). Buffer size: " + length);

      var frames_processed = 0;
      var output_frames = [];

      // Analysis Phase: Perform STFT, and calculate phase adjustments.
      for (var start = 0; start < (length - points); start += hop) { //
        var section = new Float32Array(points);
        section.set(data.subarray(start, start + points));
        if (section.length < points) break;

        if (vocode) {
          var fft = new FFT(points, freq);
          fft.forward(hanning.process(section));
          output_frames.push(fft);
          var this_frame = fft;
          frames_processed++;

          if (frames_processed > 1) {
            var last_frame = output_frames[frames_processed - 2];
            // For each bin
            for (var bin = 0; bin < points; ++bin) { // only work on the lower freqs
              var phase_shift = phase(this_frame, bin) - phase(last_frame, bin);
              var freq_deviation = (phase_shift / (hop / freq)) - fft.getBandFrequency(bin);
              var wrapped_deviation = ((freq_deviation + Math.PI) % (2 * Math.PI)) - Math.PI;
              var true_freq = fft.getBandFrequency(bin) + wrapped_deviation;
              var new_phase = phase(last_frame, bin) + ((hop_synthesis / freq) * true_freq);

              // Calculate new spectrum
              var new_mag = Math.sqrt(
                (this_frame.real[bin] * this_frame.real[bin]) +
                (this_frame.imag[bin] * this_frame.imag[bin]));

              this_frame.real[bin] = new_mag * Math.cos(new_phase);
              this_frame.imag[bin] = new_mag * Math.sin(new_phase);
            }
          }
        } else {
          output_frames.push(hanning.process(section));
          frames_processed++;
        }

        progress(1, frames_processed, parseInt(((length - points) / hop)));
      }

      L("Analysis complete: " + frames_processed + " frames.")

      // Synthesis Phase
      var final_buffer = new Float32Array(parseInt(length * stretch_amount));
      var overlap_pointer = 0;
      var total_output = 0;
      for (var i = 0; i < output_frames.length; ++i) {
        var fft = output_frames[i];
        var buffer = vocode ? hanning.process(fft.inverse()) : fft;
        // var buffer = hanning.process(vocode ? fft.inverse() : fft);

        for (var j = 0; j < buffer.length; ++j) {
          final_buffer[overlap_pointer + j] += buffer[j];
        }
        total_output += buffer.length;
        overlap_pointer += hop_synthesis;
        progress(2, i + 1, output_frames.length);
      }

      progress(2, output_frames.length, output_frames.length, true);
      this.stretched_buffer = final_buffer;
      return this;
    },

    resize: function(size) {
      var buffer = this.stretched_buffer;
      var newBuffer = new Float32Array(size);
      this.resampled_buffer = tools.interpolateArray(buffer, newBuffer, size);
      return this;
    }
  }

  return TimeStretcher;
})()

return {TimeStretcher: TimeStretcher}
});