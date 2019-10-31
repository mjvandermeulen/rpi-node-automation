"use strict";
exports.__esModule = true;
var python_shell_1 = require("python-shell");
var options = {
    mode: 'text',
    pythonPath: '/usr/bin/python3',
    scriptPath: '/home/pi/Programming/Automation/executables',
    args: ['10', 'on']
};
python_shell_1.PythonShell.run('rfoutlets_switch_group.py', options, function (err, results) {
    if (err)
        throw err;
    console.log("results: " + results);
});
