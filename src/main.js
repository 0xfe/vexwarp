requirejs.config({
    baseUrl: 'js',
    paths: {
        'jquery':               'support/jquery-2.0.3',
        'jquery.bootstrap':     'support/bootstrap.min',
        'alertify':             'support/alertify.min',
        'lodash':               'support/lodash.min',
        'dsp':                  'support/dsp',
        'bootstrap.slider':     'support/bootstrap-slider.min',

        'graph':                'graph',
        'stretch':              'stretch',
        'tools':                'tools',
        'warp':                 'warp'
    },

    shim: {
        'backbone': {deps: ['lodash', 'jquery'], exports: 'Backbone'},
        'dsp': {
          exports: 'dsp',
          init: function() {
            return { DSP: DSP,
                     FFT: FFT,
                     WindowFunction: WindowFunction }
          }
        },
        'jquery.bootstrap': {deps: ['jquery']},
        'bootstrap.slider': {deps: ['jquery.bootstrap']},
        'alertify': {exports: 'alertify'}
    }
});

require(['app'],
function (app) {
  app();
});
