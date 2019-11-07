"use strict";
exports.__esModule = true;
var python_shell_1 = require("python-shell");
var Outlets = /** @class */ (function () {
    function Outlets(io, socketName) {
        var _this = this;
        this.onOutlets = new Set([]);
        io.sockets.on('connection', function (socket) {
            socket.on(socketName, function (socketData) {
                var currentValue = _this.onOutlets.has(socketData.group) ? 1 : 0;
                var returnData = {
                    group: socketData.group,
                    value: currentValue
                };
                console.log("Server socket.on");
                console.log("  currentValue: " + currentValue);
                console.log("  socketData.group: " + socketData.group);
                console.log("  socketData.value: " + socketData.value);
                if (socketData.value === -1) {
                    // light sync requested
                    // only emit to current socket.
                    returnData.value = currentValue;
                    socket.emit(socketName, returnData);
                }
                else {
                    // always send light signal, even if server thinks the modes match
                    _this["switch"](socketData.group, socketData.value === 1);
                    // emit to all sockets, except the current one
                    socket.broadcast.emit(socketName, socketData);
                }
            });
        });
    }
    Outlets.prototype["switch"] = function (group, mode) {
        var modeString = mode ? 'on' : 'off';
        var options = {
            mode: 'text',
            pythonPath: '/usr/bin/python3',
            scriptPath: '/home/pi/Programming/Automation/executables',
            args: [group, modeString, '--attempts', '1']
        };
        if (mode) {
            this.onOutlets.add(group);
        }
        else {
            this.onOutlets["delete"](group);
        }
        python_shell_1.PythonShell.run('rfoutlets_switch_group.py', options, function (err, results) {
            if (err)
                throw err;
            console.log();
            console.log("PythonShell:");
            console.log("  results: " + results);
            console.log("  modeString: " + modeString);
            console.log("  group: " + group);
            console.log();
        });
    };
    return Outlets;
}());
exports.Outlets = Outlets;
