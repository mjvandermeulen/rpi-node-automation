"use strict";
exports.__esModule = true;
var http = require('http').createServer(handler);
var io = require('socket.io')(http); // require socket.io module
var fs = require('fs');
var Gpio = require('onoff').Gpio; // move push button out of this file
var LED = new Gpio(6, 'out');
// 'rising': only presses are handled
var pushButton = new Gpio(19, 'in', 'rising', { debounceTimeout: 10 });
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
pushButton.watch(function (err, button_value) {
    // var nextLight = 0
    // if (err) {
    //   console.error(`There was an error ${err}`)
    //   return
    // }
    // if (button_value === 1) {
    //   nextLight = LED.readSync() ^ 1 // the caret is the XOR (Exclusive OR operator)
    //   console.log(`Button Pressed. nextLight: ${nextLight}`)
    //   // emit to all sockets
    //   io.emit('light', nextLight)
    //   switchLight(nextLight)
    // } else {
    //   // NOTE: pushButton set to 'rising'
    //   console.log('WARNING: button release should not be processed')
    // }
});
var outlets = new Outlets_1.Outlets(io, 'light');
process.on('SIGINT', function () {
    LED.writeSync(0);
    LED.unexport();
    pushButton.unexport();
    process.exit();
});
