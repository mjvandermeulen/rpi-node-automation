var http = require('http').createServer(handler)
var fs = require('fs')
var io = require('socket.io')(http) // require socket.io module
var Gpio = require('onoff').Gpio
var LED = new Gpio(6, 'out')
// 'rising': only presses are handled
var pushButton = new Gpio(19, 'in', 'rising', { debounceTimeout: 10 })

http.listen(8080)

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
  var next_light = 0
  if (err) {
    console.error(`There was an error ${err}`)
    return
  }
  if (button_value === 1) {
    next_light = LED.readSync() ^ 1 // the caret is the XOR (Exclusive OR operator)
    console.log(`Button Pressed. next_light: ${next_light}`)
    LED.writeSync(next_light)
    // emit to all sockets
    io.emit('light', next_light)
  } else {
    // NOTE: pushButton set to 'rising'
    console.log('WEIRD: button release is being processed')
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
        LED.writeSync(lightvalue)
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
