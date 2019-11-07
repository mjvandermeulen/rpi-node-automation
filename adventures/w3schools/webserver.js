"use strict";
exports.__esModule = true;
var httpModule = require("http");
var http = httpModule.createServer(handler);
var fs = require("fs");
var onoff_1 = require("onoff");
var LED = new onoff_1.Gpio(6, 'out');
// 'rising': only presses are handled
var pushButton = new onoff_1.Gpio(19, 'in', 'rising', { debounceTimeout: 10 });
var Outlets_1 = require("./Outlets");
var modes = {
    livingroom: false,
    office: false,
    fan: false
};
http.listen(8091);
function handler(req, res) {
    fs.readFile(__dirname + '/public/index.html', function (err, data) {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        return res.end();
    });
}
var outlets = new Outlets_1.Outlets(http, 'light');
pushButton.watch(function (err, button_value) {
    var mode;
    if (err) {
        console.error("There was an error " + err);
        return;
    }
    if (button_value === 1) {
        mode = outlets.toggle('officelight');
        LED.writeSync(mode ? 1 : 0);
        console.log("Button Pressed. that's it");
    }
    else {
        // NOTE: pushButton set to 'rising'
        console.log('WARNING: button release should not be processed');
    }
});
process.on('SIGINT', function () {
    LED.writeSync(0);
    LED.unexport();
    pushButton.unexport();
    process.exit();
});
