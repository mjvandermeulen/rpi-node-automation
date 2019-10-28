var http = require('http').createServer(handler)
var fs = require('fs')
var io = require('socket.io')(http) // require socket.io module
var Gpio = require('onoff').Gpio
var LED = new Gpio(6, 'out')
var pushButton = new Gpio(19, 'in', 'both') // both press and release are handled

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

io.sockets.on('connection', function(socket) {
  var lightvalue = 0
  pushButton.watch(function(err, value) {
    if (err) {
      console.error(`There was an error ${err}`)
      return
    }
    lightvalue = value
    socket.emit('light', lightvalue)
  })

  socket.on('light', function(data) {
    // get light switch status from client
    lightvalue = data
    if (lightvalue != LED.readSync()) {
      LED.writeSync(lightvalue)
    } else {
      //   LED.writeSync(lightvalue) // uncomment these lines for a fun test
      //   console.log(`redundant switch write Sync ${lightvalue}`)
    }
  })
})

process.on('SIGINT', function() {
  LED.writeSync(0)
  LED.unexport()
  pushButton.unexport()
  process.exit()
})
