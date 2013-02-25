/*jshint undef:true browser:true boss:true */
/*global Asa */

(function(Asa){
"use strict";

var tsFormats = [
  "srt" , /([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})/,
  "asa",  /([0-9]{2}):([0-9]{2}):([0-9]{2})\.([0-9]{3})/,
  "vtt",  /([0-9]{2}):([0-9]{2})\.([0-9]{3})/,           
  "ass" , /([0-9]{2}):([0-9]{2}):([0-9]{2})\.([0-9]{2})/
];

var __ = {
  parseTime: function(timestamp) {
    var stamp, format;

    for(var i = 0, ii = tsFormats.length; i < ii; i++) {
      if(stamp = tsFormats[++i].exec(timestamp)) {
        format = tsFormats[i-1];
        break;
      }
    }
    var HH, MM, SS, mm;
    if(format === "vtt") {
      HH = 0;
      MM = parseInt(stamp[1],10) * 60;
      SS = parseInt(stamp[2],10);
      mm = parseFloat("0."+stamp[3],10);
    } else {
      HH = parseInt(stamp[1],10) * 60 * 60;
      MM = parseInt(stamp[2],10) * 60;
      SS = parseInt(stamp[3],10);
      mm = parseFloat("0."+stamp[4],10);
    }

    return HH + MM + SS + mm;
  },
  formatTime: function(timevalue) {
    function pad(num, n) {
      var str = num.toString();
      while(str.length < n) {
        str = "0"+str;
      }
      return str;
    }

    var split = timevalue.toString().split("."),
        mm = split[1],
        SS = split[0],
        MM = 0,
        HH = 0;

    // round milliseconds to three decimals
    if(mm.length > 3) {
      mm = (parseInt(mm,10) / Math.pow(10,mm.length-3) + 0.5) >> 0;
    }

    while(SS > 59) {
      MM++;
      SS -= 60;
    }

    while(MM > 59) {
      HH++;
      MM -= 60;
    }

    return pad(HH,2) + ":" + pad(MM,2) + ":" + pad(SS,2) + "." + pad(mm,3);
  }
};

Asa.Utils = __;

})(Asa);