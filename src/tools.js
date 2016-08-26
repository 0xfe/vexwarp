define(['jquery'], function($) {
  function L() {
      /*
      if (details.complete) progress_pct = 100;
      $("#progress").css("width", progress_pct+"%");
      $("#progress").text(Array.prototype.slice.call(arguments).join(" "));
      */
      console.log(Array.prototype.slice.call(arguments).join(" "));
  }

  function merge(destination, source) {
    for (var property in source)
        destination[property] = source[property];
    return destination;
  }

  function prettyTime (seconds) {
    var hours   = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    var seconds =
      (Math.floor((seconds - (hours * 3600) - (minutes * 60)) * 100) / 100).toFixed(2);
    var time = "";

    if (hours != 0) {
      time = hours+":";
    }
    if (minutes != 0 || time !== "") {
      minutes = (minutes < 10 && time !== "") ? "0"+minutes : String(minutes);
      time += minutes+":";
    }
    if (time === "") {
      time = seconds;
    }
    else {
      time += (seconds < 10) ? "0"+seconds : String(seconds);
    }
    return time;
  }

  function onProgress(details, message) {
    if (details.complete) {
      L(message, "Done.");
    } else {
      var per_stage_factor = 0;
      var stage_factor = 0;
      if (details.total_stages > 0) {
        per_stage_factor = 1 / details.total_stages;
        stage_factor = (details.current_stage - 1) / details.total_stages;
      }
      var progress_pct = parseInt((details.current_window / details.total_windows) * 100);
      // Log every 10%
      if ((this.last_pct != progress_pct) && (progress_pct % 10 == 0)) {
        var total_pct = (stage_factor * 100) + (per_stage_factor * progress_pct);

        if (details.total_stages == 0) {
          L(message, "Progress:", details.current_window,
            "/", details.total_windows, "("+progress_pct+"%)");
            this.last_pct = progress_pct;
        } else {
          L(message, "Stage:", details.current_stage,
            "/", details.total_stages,
            "Progress:", details.current_window,
            "/", details.total_windows, "("+total_pct+"%)");
            this.last_pct = progress_pct;
        }
      }
    }
  }

  function interpolateArray(data, newData, fitCount) {
    var springFactor = new Number((data.length - 1) / (fitCount - 1));
    newData[0] = data[0]; // for new allocation
    for ( var i = 1; i < fitCount - 1; i++) {
      var tmp = i * springFactor;
      var before = Math.floor(tmp);
      var after = Math.ceil(tmp);
      var atPoint = tmp - before;
      newData[i] = data[before] + (data[after] - data[before]) * atPoint;

      onProgress({current_stage: 1, total_stages: 0, current_window: i, total_windows: (fitCount - 1)},
        "Interpolating: ");
    }

    onProgress({complete: true}, "Interpolating: ");
    newData[fitCount - 1] = data[data.length - 1]; // for new allocation
    return newData;
  };

  return {
    onProgress: onProgress,
    merge: merge,
    prettyTime: prettyTime,
    interpolateArray: interpolateArray
  }
});