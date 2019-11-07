"use strict";
exports.__esModule = true;
var socketio = require("socket.io");
var python_shell_1 = require("python-shell");
var Outlets = /** @class */ (function () {
    function Outlets(http, socketName) {
        var _this = this;
        this.io = socketio(http); // require socket.io module
        this.socketName = socketName;
        this.onOutlets = new Set([]);
        this.io.sockets.on('connection', function (socket) {
            console.log("this.io.sockets.on .....");
            socket.on(_this.socketName, function (socketData) {
                var currentValue = _this.onOutlets.has(socketData.group) ? 1 : 0;
                console.log("Server socket.on");
                console.log("  currentValue: " + currentValue);
                console.log("  socketData.group: " + socketData.group);
                console.log("  socketData.value: " + socketData.value);
                var returnData = {
                    group: socketData.group,
                    value: currentValue
                };
                if (socketData.value === -1) {
                    // light sync requested
                    // only emit to current socket.
                    returnData.value = currentValue;
                    socket.emit(_this.socketName, returnData);
                }
                else {
                    // always send light signal, even if server thinks the modes match
                    _this["switch"](socketData.group, socketData.value === 1);
                    // emit to all sockets, except the current one
                    socket.broadcast.emit(_this.socketName, socketData);
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
    Outlets.prototype.groupOn = function (group) {
        return this.onOutlets.has(group);
    };
    // public toggle(group: string): boolean {
    //   let nextMode: boolean = !this.groupOn(group)
    //   this.switch(group, nextMode)
    //   return nextMode
    // }
    Outlets.prototype.emit = function (group, mode) {
        var returnData = {
            group: group,
            value: mode ? 1 : 0
        };
        // console.log(`emit\n  returnData: ${returnData.group}`)
        this.io.emit(this.socketName, returnData);
    };
    Outlets.prototype.toggle = function (group) {
        var nextMode = !this.groupOn(group);
        this.emit(group, nextMode);
        this["switch"](group, nextMode);
        return nextMode;
    };
    return Outlets;
}());
exports.Outlets = Outlets;
