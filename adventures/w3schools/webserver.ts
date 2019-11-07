import * as httpModule from 'http'
const http = httpModule.createServer(handler)
import * as fs from 'fs'

import { Gpio } from 'onoff'
const LED = new Gpio(6, 'out')
// 'rising': only presses are handled
const pushButton = new Gpio(19, 'in', 'rising', { debounceTimeout: 10 })

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

let outlets = new Outlets(http, 'light')

pushButton.watch(function(err, button_value) {
  let mode: boolean
  if (err) {
    console.error(`There was an error ${err}`)
    return
  }
  if (button_value === 1) {
    mode = outlets.toggle('officelight')
    LED.writeSync(mode ? 1 : 0)
    console.log(`Button Pressed. that's it`)
  } else {
    // NOTE: pushButton set to 'rising'
    console.log('WARNING: button release should not be processed')
  }
})

process.on('SIGINT', function() {
  LED.writeSync(0)
  LED.unexport()
  pushButton.unexport()
  process.exit()
})
