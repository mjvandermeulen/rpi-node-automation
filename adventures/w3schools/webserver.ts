var http = require('http').createServer(handler)
var fs = require('fs')
var io = require('socket.io')(http) // require socket.io module
var Gpio = require('onoff').Gpio
var LED = new Gpio(6, 'out')
// 'rising': only presses are handled
var pushButton = new Gpio(19, 'in', 'rising', { debounceTimeout: 10 })

// PARKED ATTEMPT TO DO THINGS THE TYPESCRIPT WAY:
// import { createServer } from 'http'
// var http = createServer(handler)
// import { fs } from 'fs'
// import { socket } from 'socket.io'
// var io = socket(http)
// import { Gpio } from 'onoff'

import { PythonShell } from 'python-shell'

http.listen(8091)

function handler(req, res) {
  fs.readFile(__dirname + '/public/index.html', function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      return res.end('404 Not Found')
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.write(data)
    return res.end()
  })
}

function switchLight(nextLight) {
  LED.writeSync(nextLight)
  var mode = nextLight === 1 ? 'on' : 'off'
  let options = {
    mode: 'text',
    pythonPath: '/usr/bin/python3',
    scriptPath: '/home/pi/Programming/Automation/executables',
    args: ['10', mode, '--attempts', '1'],
  }

  PythonShell.run('rfoutlets_switch_group.py', options, function(err, results) {
    if (err) throw err
    console.log(`PythonShell results: ${results}\nmode: ${mode}\n`)
  })
}

pushButton.watch(function(err, button_value) {
  var nextLight = 0
  if (err) {
    console.error(`There was an error ${err}`)
    return
  }
  if (button_value === 1) {
    nextLight = LED.readSync() ^ 1 // the caret is the XOR (Exclusive OR operator)
    console.log(`Button Pressed. nextLight: ${nextLight}`)
    // emit to all sockets
    io.emit('light', nextLight)
    switchLight(nextLight)
  } else {
    // NOTE: pushButton set to 'rising'
    console.log('WARNING: button release should not be processed')
  }
})

io.sockets.on('connection', function(socket) {
  socket.on('light', function(lightvalue) {
    // get lightswitch status (lightvalue) from client
    var currentvalue = LED.readSync()
    console.log(
      `Server socket.on | currentvalue: ${currentvalue} lightvalue: ${lightvalue}`
    )
    if (lightvalue === -1) {
      // light sync requested
      // only emit to current socket.
      socket.emit('light', currentvalue)
    } else {
      if (lightvalue != currentvalue) {
        switchLight(lightvalue)
      }
      // emit to all sockets, except the current one
      socket.broadcast.emit('light', lightvalue)
    }
  })
})

process.on('SIGINT', function() {
  LED.writeSync(0)
  LED.unexport()
  pushButton.unexport()
  process.exit()
})
