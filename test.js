/*jshint node:true */

var express = require("express"),
		app = express();

app.use(express.logger('dev'));
app.use(express.static(__dirname+"/test"));

app.listen(3000);
console.log("Listening on port 3000");