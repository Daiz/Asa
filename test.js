/*jshint node:true */

var express = require("express"),
		//vidStreamer = require("vid-streamer"),
		app = express();

app.use(express.logger('dev'));
//app.use(app.router);
app.use(express.static(__dirname+"/test"));
/*app.use(express.static("/subs",__dirname+"/subs"));
app.get("/video", vidStreamer.settings({
	"mode": "development",
	"forceDownload": false,
	"random": false,
	"rootFolder": "/video/",
	"rootPath": "video/",
	"server": "VidStreamer"
}));
//app.use(app.router);*/

app.listen(3000);
console.log("Listening on port 3000");