// Fix up prefixing
define(['jquery', 'warp', 'jquery.bootstrap'],
function ($, WarpApp) {
  function run() {
    $(function() {
      var warp = new WarpApp();
    });
  }

  return run;
});