var http = require('http').createServer(handler)
const io = require('socket.io')(http) // require socket.io module

var fs = require('fs')

var Gpio = require('onoff').Gpio // move push button out of this file
const LED = new Gpio(6, 'out')
// 'rising': only presses are handled
var pushButton = new Gpio(19, 'in', 'rising', { debounceTimeout: 10 })

import { Outlets } from './Outlets'

var modes = {
  livingroom: false,
  office: false,
  fan: false,
}

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

pushButton.watch(function(err, button_value) {
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
})

let outlets = new Outlets(io, 'light')

process.on('SIGINT', function() {
  LED.writeSync(0)
  LED.unexport()
  pushButton.unexport()
  process.exit()
})
