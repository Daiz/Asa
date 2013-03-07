/*jshint browser:true, devel:true, jquery:true */

(function(){
"use strict";

// display renderers
function GlRenderer(surface) {
	this.surface = surface;
	this.gl = surface.getContext("experimental-webgl");
}

function DomRenderer(surface) {
	this.surface = surface;
	this.buffer = d.createDocumentFragment();
}

DomRenderer.prototype = {
	surface: null,
	buffer: null,
	previousCues: [],
	timeUpdate: function(cues) {

	}
};

// text renderer
function TextRenderer() {
	this.canvas = d.createElement('canvas');
	this.ctx = this.canvas.getContext('2d');
}

var Asa, Parser;

var d = document, __;

// __ is a small utility wrapper
__ = {

	pow2: function(value, pow) {
		pow = pow || 1;
		while(pow < value) {
			pow *= 2;
		}
		return pow;
	},

	parseTime: function(timestamp) {
		var split = timestamp.split(":"),
				hours = parseInt(split[0],10),
				minutes = parseInt(split[1],10),
				seconds = parseFloat(split[2],10);

		return seconds + minutes*60 + hours*60*60;
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
				ms = split[1],
				seconds = split[0],
				minutes = 0, hours = 0;

		// round milliseconds to three decimals
		if(ms.length > 3) {
			ms = (parseInt(ms,10) / Math.pow(10,ms.length-3) + 0.5) >> 0;
		}

		while(seconds > 59) {
			minutes++;
			seconds -= 60;
		}

		while(minutes > 59) {
			hours++;
			minutes -= 60;
		}

		return pad(hours,2) + ":" + pad(minutes,2) + ":" + pad(seconds,2) + "." + pad(ms,3);
	},

	compareCues: function(one, two) {
		var oneCue, twoCue;
		if(one.length !== two.length) {
			return false;
		}
		for(var i = 0, ii = one.length; i < ii; i++) {
			oneCue = one[i];
			twoCue = two[i];
			if(oneCue !== twoCue) {
				return false;
			}
		}
		return true;
	},

	arraySum: function(arr, pad) {
		var sum = 0;
		for(var i = 0, ii = arr.length; i < ii; i++) {
			sum += arr[i];
		}
		return sum + pad*(arr.length-1);
	}

};

// similar (but not identical) to HTML5 TextTrackCue
// http://www.whatwg.org/specs/web-apps/current-work/multipage/the-video-element.html#texttrackcue
function AsaCue(startTime, endTime, content, original) {
	this.startTime = startTime || 0.0;
	this.endTime = endTime || 0.0;
	this.text = original || "";
	this.content = content;
}

AsaCue.prototype = {
	startTime: 0,
	endTime: 0,
	text: "",
	content: [],
	id: "",
	position: "auto",
	align: 2,
	imageBufferId: 0,
	imageWidth: 0,
	imageHeight: 0,
	textWidth: 0,
	textHeight: 0,
	onenter: function() {
		return 0; // intended to be overridden
	},
	onexit: function() {
		return 0; // intended to be overridden
	}
};

// similar (but not identical) to HTML5 TextTrack
// http://www.whatwg.org/specs/web-apps/current-work/multipage/the-video-element.html#texttrack
function AsaTrack(format, label, language) {
	this.format = format || "html";
	this.label = label || "Subtitles";
	this.language = language || "en";
}

AsaTrack.prototype = {
	kind: "subtitles", // Asa is only for subtitles
	format: "html", // default and only format (for now)
	mode: "disabled",
	label: null,
	language: "en",
	cues: [],
	activeCues: [],
	addCue: function(cue) {
		this.cues.push(cue);
	},
	removeCue: function(cue) {
		var split = this.cues.indexOf(cue);
		if(split != -1) {
			this.cues = this.cues.slice(0,split).concat(this.cues.slice(split+1),this.cues.length);
		}
	},
	oncuechange: function() {
		return 0; // intended to be overridden
	}
};

Parser = {
	srt: function(src) {

		var cues = [], cue,
				lines, line,
				id, time, text, content = [];
		
		lines = src.split("\n\n");

		for(var i = 0, ii = lines.length; i < ii; i++) {
			line = lines[i].split("\n");

			if(lines[0].match(" --> ")) {
				id = i;
				time = line[0];
				text = lines.slice(2,lines.length);
			} else {
				id = line[0];
				time = line[1];
				text = lines.slice(2,lines.length);
			}

			for(var j = 0, jj = text.length; j < jj; j++) {
				content.push({type: "line", text: text[j]});
			}

			time = time.replace(/,/g,".").split(" --> ");
			cue = new AsaCue(__.parseTime(time[0]), __.parseTime(time[1]), content, text.join("\n"));
			cue.id = id;

			cues.push(cue);
		}

		return cues;
	}
};

Asa = {

	activeTrack: -1,
	bufIndex: 0,
	Buffer: [],
	Parser: Parser,

	clearBuffer: function() {
		Asa.Buffer = [];
	},

	bufferImage: function(canvas) {
		var buffer = Asa.Buffer,
				len = buffer.length,
				i = Asa.bufIndex, img;

		if(len < Asa.bufferSize) {
			img = new Image();
			img.src = canvas.toDataURL();
			img.width = canvas.width/2;
			img.height = canvas.height/2;
			buffer.push(img);
			return len;
		} else {
			if(i+1 === Asa.bufferSize) {
				i = 0;
			}
			img = buffer[i];
			img.src = canvas.toDataURL();
			return i++;
		}
	},
	
	renderLine: function(cue) {
		var style = Asa.defaultStyle,
				canvas = Asa.textCanvas,
				ctx = Asa.textRenderer,
				p = Asa.precision, scale,
				text = cue.text, styleModified = false;

		if(style.styleResY !== Asa.displayHeight) {
			scale = Asa.displayHeight / style.styleResY;
			style.marginLeft *= scale;
			style.marginRight *= scale;
			style.marginVert *= scale;
			style.fontSize *= scale;
			style.strokeSize *= scale;
			style.shadowSize *= scale;
			style.styleResX = Asa.displayWidth;
			style.styleResY = Asa.displayHeight;
			styleModified = true;
		}

		if(styleModified) {
			Asa.scaledStyle = JSON.parse(JSON.stringify(style));
			Asa.scaledStyle.precision = 1;
		}

		style = Asa.scaledStyle;

		if(style.precision !== p) {
			style.marginLeft *= p;
			style.marginRight *= p;
			style.marginVert *= p;
			style.fontSize *= p;
			style.strokeSize *= p;
			style.shadowSize *= p;
			style.precision = p;
		}

		var lineWidth, lineCount, lines = [], line,
				textWidth, lineTargetWidth, words,
				spaceWidth, wordWidths = [],
				longestLine = 0, textLines = [], lineText,
				curLineWidth = 0, curLineStart = 0;

		

		ctx.font = [
			style.fontWeight,
			style.fontSize+"px",
			style.font
		].join(" ");

		text = text.replace(/\s+$/,'');
		if(!text.match("\n")) {
			textWidth = ctx.measureText(text).width;
			if(!style.useTightMargins) {
				lineWidth = Asa.renderWidth - style.marginLeft - style.marginRight;
				lineCount = Math.ceil(textWidth / lineWidth);
			} else {
				var curMarginLeft = style.tightMarginLeft,
						curMarginRight = style.tightMarginRight,
						diffMarginLeft = curMarginLeft - style.marginLeft,
						diffMarginRight = curMarginRight - style.marginRight;

				for(var lc = 0; lc <= 9; lc++) {
					lineWidth = Asa.renderWidth - curMarginLeft - curMarginRight;
					curMarginLeft += diffMarginLeft/10;
					curMarginRight += diffMarginRight/10;
					lineCount = Math.ceil(textWidth / lineWidth);
					if(lineCount < 3) {
						break;
					}
				}
			}
			
			if(lineCount > 1) {
				words = text.split(" ");
				spaceWidth = ctx.measureText(" ").width;
				for(var k = 0, kk = words.length; k < kk; k++) {
					wordWidths.push(ctx.measureText(words[k]).width);
				}
			} // two-liners get special line-breaking treatment because it's the optimal multi-line case
			if(lineCount === 2) {
				var top, btm, diff, splitpoint, minDiff = 10000000;
				for(var m = 0, mm = words.length; m < mm; m++) {
					top = 0; btm = 0;
					for(var n = 0; n < mm; n++) {
						top = __.arraySum(wordWidths.slice(0,n+1),spaceWidth);
						btm = __.arraySum(wordWidths.slice(n+1,mm),spaceWidth);
						diff = top - btm;
						diff = diff > 0 ? diff : -diff;
						if(diff < minDiff) {
							minDiff = diff;
							splitpoint = n+1;
						}
					}
				}
				top = __.arraySum(wordWidths.slice(0,splitpoint),spaceWidth);
				btm = __.arraySum(wordWidths.slice(splitpoint,words.length),spaceWidth);
				longestLine = top > btm ? top : btm;
				lines = [
				{text: words.slice(0,splitpoint).join(" "), width: top},
				{text: words.slice(splitpoint,words.length).join(" "), width: btm}
				];
			} else // if your subtitles go over two lines you are a bad person and should feel bad
			if(lineCount > 2) {
				lineTargetWidth = textWidth / lineCount;

				for(var i = 0, ii = words.length; i < ii; i++) {
					if(curLineWidth > 0) {
						curLineWidth += spaceWidth;
					}
					curLineWidth += wordWidths[i];
					if(curLineWidth >= lineTargetWidth) {
						lines.push({text: words.slice(curLineStart,i+1).join(" "), width: curLineWidth});
						if(curLineWidth > longestLine) {
							longestLine = curLineWidth;
						}
						curLineStart = i+1;
						curLineWidth = 0;
					}
				}
				if(curLineWidth > 0) {
					lines.push({text: words.slice(curLineStart,ii).join(" "), width: curLineWidth});
					if(curLineWidth > longestLine) {
						longestLine = curLineWidth;
					}
				}
			} else {
				lines = [{text: text, width: textWidth}];
				longestLine = textWidth;
			}
		} else {
			textLines = text.split("\n");
			for(var j = 0, jj = lines.length; j < jj; j++) {
				lineText = textLines[j].replace(/\s+$/,"");
				curLineWidth = ctx.measureText(lineText).width;
				lines.push({text: lineText, width: curLineWidth});
				if(curLineWidth > longestLine) {
					longestLine = curLineWidth;
				}
			}
			lineCount = lines.length;
		}

		cue.textWidth = longestLine;
		cue.textHeight = style.fontSize*style.lineHeight*lineCount;
		var extraSize = style.strokeSize*2;// + style.shadowSize;
		cue.imageWidth = cue.textWidth+extraSize;//__.pow2(cue.textWidth+extraSize);
		cue.imageHeight = cue.textHeight+extraSize;//__.pow2(cue.textHeight+extraSize);
		cue.imageWidth += 2 + (cue.imageWidth & 1);
		cue.imageHeight += 2 + (cue.imageHeight & 1);
		cue.position = {
			x: Asa.renderWidth / 2 - cue.imageWidth/2,
			y: Asa.renderHeight - cue.imageHeight - (style.marginVert - (cue.imageHeight - cue.textHeight) / 2)
		};

		canvas.width = cue.imageWidth;
		canvas.height = cue.imageHeight;

		var lineHeight = style.fontSize * style.lineHeight;

		var x = cue.imageWidth / 2, y = cue.imageHeight / 2 - (lineHeight*lines.length/2) + lineHeight/2;
		
		ctx.font = [
			style.fontWeight,
			style.fontSize+"px",
			style.font
		].join(" ");
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.strokeStyle = style.strokeColor;
		ctx.fillStyle = style.fillColor;
		ctx.lineWidth = style.strokeSize*2;
		ctx.lineJoin = 'round';
		ctx.translate(x, y);
		//ctx.scale(style.scaleX, style.scaleY);
		for(var l = 0, ll = lines.length; l < ll; l++) {
			lineText = lines[l].text;
			ctx.strokeText(lineText, 0, 0);
			ctx.fillText(lineText, 0, 0);
			ctx.translate(0, lineHeight);
		}

		cue.imageBufferId = Asa.bufferImage(canvas);

	},

	drawUpdate: function(time) {
		if(Asa.activeTrack === -1) {
			return;
		}

		var track = Asa.tracks[Asa.activeTrack],
				cues = track.activeCues, cue, image;

		//Asa.displayRenderer.clearRect(0, 0, Asa.renderWidth, Asa.renderHeight);
		$('.subtitles img').detach();

		for(var i = 0, ii = cues.length; i < ii; i++) {
			cue = cues[i];
			image = Asa.Buffer[cue.imageBufferId];
			if(image) {
				$(image).appendTo('.subtitles');
				image.setAttribute('style','top: '+(cue.position.y/2)+'px; left: '+(cue.position.x/2)+'px;');
				/*Asa.displayRenderer.drawImage(
				image, cue.position.x, cue.position.y,
				cue.imageWidth, cue.imageHeight
				);*/
			}
		}
	},

	previousTime: 0,

	timeUpdate: function() {

		var time = Asa.video.currentTime,
				previousTime = Asa.previousTime,
				track, cue, seeked = false;

		// set active tracks
		Asa.activeTracks = [];
		for(var i = 0, ii = Asa.tracks.length; i < ii; i++) {
			track = Asa.tracks[i];
			if(track.display !== "disabled") {
				Asa.activeTracks.push(track);
			}
		}

		// set active cues for active tracks
		for(i = 0, ii = Asa.activeTracks.length; i < ii; i++) {
			track = Asa.activeTracks[i];
			track.lastActiveCues = track.activeCues.slice(0);
			track.activeCues = [];
			for(var j = 0, jj = track.cues.length; j < jj; j++) {
				cue = track.cues[j];

				if(cue.startTime <= time && cue.endTime >= time) {
					track.activeCues.push(cue);
				}

				// call cue events
				if(!seeked && cue.startTime <= time && cue.startTime > previousTime) {
					cue.onenter();
				}
				if(!seeked && cue.endTime < time && cue.endTime >= previousTime) {
					cue.onexit();
				}

			}

			if(track.display === "showing") {
				Asa.renderer.timeUpdate(track.activeCues);
			}

			// check if there's been changes in active cues and call the cuechange event of the track if yes
			if(!__.compareCues(track.activeCues,track.lastActiveCues)) {
				track.oncuechange();
				//Asa.drawUpdate(time);
			}
		}

		Asa.previousTime = time;
	},

	setDisplaySize: function(w, h) {
		
		var videoWidth = w || Asa.video.videoWidth,
				videoHeight = h || Asa.video.videoHeight,
				elemWidth = Asa.video.width || Asa.video.offsetWidth,
				elemHeight = Asa.video.height || Asa.video.offsetHeight,
				videoAR = videoWidth / videoHeight,
				elemAR = elemWidth / elemHeight;

		if(videoAR === elemAR) {
			Asa.displayWidth = elemWidth;
			Asa.displayHeight = elemHeight;
		} else
		if(elemAR > videoAR) {
			Asa.displayHeight = elemHeight;
			Asa.displayWidth = elemHeight * videoAR;
		} else
		if(elemAR < videoAR) {
			Asa.displayWidth = elemWidth;
			Asa.displayHeight = elemWidth / videoAR;
		} else {
			console.error("Asa: Can't set display size");
			return;
		}

		Asa.renderWidth = Asa.displayWidth*Asa.precision;
		Asa.renderHeight = Asa.displayHeight*Asa.precision;
		//Asa.displaySurface.width = Asa.renderWidth;
		//Asa.displaySurface.height = Asa.renderHeight;
	},

	init: function(content, options) {

		// get the player
		Asa.player = d.querySelector(".asa-player");

		// create the video element
		Asa.video = d.createElement("video");

		// create the text canvas
		Asa.textCanvas = d.createElement('canvas');

		// check for webgl
		/*var gl = Asa.textCanvas.getContext("experimental-webgl");*/
		var gl = null; // since gl renderer doesn't exist yet, always use dom renderer
		if(gl) {
			// create subtitle canvas
			Asa.displaySurface = d.createElement('canvas');
			Asa.renderer = new GlRenderer(Asa.displaySurface);
		} else {
			// create subtitle div
			Asa.displaySurface = d.createElement('div');
			Asa.renderer = new DomRenderer(Asa.displaySurface);
		}

		Asa.displaySurface.className = 'subtitles';

		// get the controls
		Asa.controls = d.querySelector('.asa-controls');

		// add elements to player
		Asa.player.appendChild(Asa.video);
		Asa.player.appendChild(Asa.displaySurface);
		Asa.player.appendChild(Asa.controls);

		// set text renderer
		Asa.textRenderer = Asa.textCanvas.getContext('2d');

		// set content
		Asa.setVideo(content.video);
		Asa.setSubtitles(content.subtitles);
		Asa.setTitle(content.title);
		Asa.setChapters(content.chapters);

		// set options
		Asa.setOptions(options);

		var source, format;
		for(var i = 0, ii = content.video.formats.length; i < ii; i++) {
			format = content.video.formats[i];
			source = d.createElement('source');
			source.src = content.video.path.replace("%res%",content.video.res[0])+"."+format;
			source.type = "video/"+format;
			Asa.video.appendChild(source);
		}

		// deal with options
		Asa.defaultStyle = {
			font: "Trebuchet MS",
			fontSize: 40,
			lineHeight: 1.25,
			fontWeight: "bold",
			fillColor: "#FFFFFF",
			strokeColor: "#000000",
			shadowColor: "rgba(0,0,0,0.25)",
			strokeSize: 3,
			shadowSize: 1.5,
			scaleX: 1.0,
			scaleY: 1.0,
			align: 2, // numpad notation
			marginLeft: 60,
			marginRight: 60,
			tightMarginLeft: 300,
			tightMarginRight: 300,
			useTightMargins: true, // tight margins are used for advanced line breaking
			marginVert: 50,
			styleResX: 1280,
			styleResY: 720
		};

		if(options.defaultStyle) {
			for(var k in options.defaultStyle) {
				Asa.defaultStyle[k] = options.defaultStyle[k];
			}
		}

		Asa.scaledStyle = JSON.parse(JSON.stringify(Asa.defaultStyle));
		Asa.scaledStyle.precision = 1;

		Asa.precision = options.precision || 2; // recommended for high-quality rendering
		Asa.bufferSize = options.bufferSize || 100; // default amount of subtitles to pre-render

		// set the current display size
		Asa.setDisplaySize();

		// parse the subtitle tracks
		Asa.tracks = [];

		var track, format, asaFormat;
		for(var i = 0, ii = tracks.length; i < ii; i++) {
			
			track = tracks[i];
			format = track.src.split(".");
			format = format[format.length-1];

			if(format === "srt") {
				asaFormat = "html";
			}

			if(Asa.Parser.hasOwnProperty(format)) {
				var asaTrack = new AsaTrack(asaFormat, track.label, track.language);
				asaTrack.display = track.display || "disabled";
				if(asaTrack.display === "showing") {
					Asa.activeTrack = i;
				}
				var xhr = new XMLHttpRequest();
				xhr.open("GET",track.src,false);
				xhr.send();
				asaTrack.cues = Asa.Parser[format](xhr.responseText);
				Asa.tracks.push(asaTrack);
			} else {
				console.error("Asa: Unknown format ("+format+")");
			}

		}
		console.time("rendering");
		for(var b = 0; b < 100; b++) {
			Asa.renderLine(Asa.tracks[0].cues[b]);
		}
		console.timeEnd("rendering");

		// bind video timeupdate
		Asa.video.addEventListener("timeupdate", Asa.timeUpdate, false);
		Asa.video.addEventListener("seeked", Asa.clearBuffer, false);

	}
};

window.Asa = Asa;

})();