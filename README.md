# VexWarp

VexWarp is a JavaScript implementation of the [STFT](https://en.wikipedia.org/wiki/Short-time_Fourier_transform) and [Phase Vocoder](https://en.wikipedia.org/wiki/Phase_vocoder) algorithms for audio time stretching and pitch shifting. It can be used to slow down (or speed up) audio segments without changing pitch, ot to transpose audio segments without changing speed, or both.

VexWarp currently uses `dsp.js` for its FFT, but will work with any FFT library that supports typed arrays. The meat of the algorthm is in `src/stretch.js`, and it can be used in both batch and real-time applications.

# Demo

See VexWarp in action here: [VexWarp](http://www.vexflow.com/vexwarp/).

This repository contains all the code used in the above demo, and in the [VexWarp Chrome extension](https://chrome.google.com/webstore/detail/vexwarp-audio-stretcher/nkdmbkieeegbiockljbbebpdafnbckfj).

# MIT License

**Copyright (c) Mohit Muthanna Cheppudira 2012**

0xFE (mohit@muthanna.com) (http://www.vexflow.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
