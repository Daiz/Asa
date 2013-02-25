/*jshint undef:true devel:true browser:true boss:true */
/*global Asa */

(function(Asa){
"use strict";
var __ = Asa.Utils; // utility belt

function flatParser(regex, rules) {
  return function(str) {
    var result = [], match, obj;

    while(str) {
      match = null;
      obj = {};
      for(var i = 0, ii = regex.length; i < ii; i++) {
        if(match = regex[i].rule.exec(str)) {
          rules[regex[i].name](match, obj);
          break;
        }
      }
      if(match) {
        if(Object.keys(obj).length) {
          result.push(obj);
        }
        str = str.replace(match[0], "");
      } else {
        return false; // Parsing failure
      }
    }
    if(rules.cleanup) {
      rules.cleanup(result);
    }
    return result;
  };
}

var Parser = {};

// SRT parser

var srtRegex = [
  {name: "startTag", rule: /^<(b|i|u|font color=)(\"#[a-fA-F0-9]{6}\")?>/},
  {name: "endTag"  , rule: /^<\/(b|i|u|font)>/},
  {name: "text"    , rule: /^[^<\n]+/},
  {name: "newline" , rule: /^\n/}
],
srtRules = {
  startTag: function(match, obj) {
    obj.name = "override";
    obj.attrs = {};
    if(match[1] !== "font color=") {
      obj.attrs[match[1]] = 1;
    } else {
      if(match[2]) {
        obj.attrs.fc = match[2].replace(/\"/g,"");
      } else {
        obj = {};
      }
    }
  },
  endTag: function(match, obj) {
    obj.name = "override";
    obj.attrs = {};
    obj.attrs[match[1]] = 0;
  },
  text: function(match, obj) {
    obj.text = match[0];
  },
  newline: function(match, obj) {
    obj.name = "newline";
  }
};

Parser.srtMarkup = flatParser(srtRegex, srtRules);
Parser.srt = function(elem) {
  var src = elem.getAttribute('src'),
      kind = elem.getAttribute('kind') || "subtitles",
      label = elem.getAttribute('label') || "Subtitles",
      lang = elem.getAttribute('srclang') || "en",
      def = elem.hasAttribute('default') || false,
      track = new Asa.Track(kind, label, lang);
  
  track.mode = def ? "showing" : "disabled";

  // load the source
  var xhr = new XMLHttpRequest();
  xhr.open("GET",src,true);
  xhr.send();

  // make sure line breaks only use \n
  src = xhr.responseText.replace(/\r\n|\r/g,"\n");

   var lines = src.split("\n\n"), line,
      cues = [], cue, id, time, text, content;

  for(var i = 0, ii = lines.length; i < ii; i++) {
    line = lines[i].split("\n");

    id = line[0]; // SRT uses unique numeric ids
    time = line[1].match(/[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}/g); // time format: 00:00:00,000
    text = line.slice(2).join("\n");
    content = Parser.srtMarkup(text);

    if(!id || time.length !== 2 || !content) {
      return false;
    }

    cue = new Asa.Cue(__.parseTime(time[0]), __.parseTime(time[1]), content, text);
    cue.id = id;
    cue.number = i;

    cues.push(cue);

  }

  track.cues = cues;

  return track;
};

Asa.Parser = Parser;

})(Asa);