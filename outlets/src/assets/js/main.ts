// CDN packages
declare const io: any
declare const moment: any

const socket = io() // load socket.io-client and connect to the host that serves the page

interface Adjustments {
  plus: number
  plusplus: number
  minus: number
  minusminus: number
}

// Not DRY, see app.ts
interface Group {
  displayName: string
  defaultTimer: number
}

const timers = {
  // milliseconds since epoch when timer should go off
  // 0 if not set
}

// all times in milliseconds
const smallAdjustment: number = 5 * 1000
const largeAdjustment: number = 30 * 60 * 1000

const timeAdjustments: Adjustments = {
  plus: smallAdjustment,
  plusplus: largeAdjustment,
  minus: -smallAdjustment,
  minusminus: -largeAdjustment,
}

function socketCounter(spanId) {
  const counter = document.getElementById(spanId)
  const c = parseInt(counter.innerHTML) + 1
  counter.innerHTML = c.toString()
}

function switchButton(data) {
  // change from data to group and mode TODO ***
  var onElement = document.getElementById(data.group + 'On')
  var offElement = document.getElementById(data.group + 'Off')
  if (data.mode) {
    onElement.classList.add('btnOnOffActive')
    offElement.classList.remove('btnOnOffActive')
  } else {
    onElement.classList.remove('btnOnOffActive')
    offElement.classList.add('btnOnOffActive')
  }
}

function addBtnEvent(group) {
  var onElement = document.getElementById(group + 'On')
  var offElement = document.getElementById(group + 'Off')

  onElement.addEventListener('click', function() {
    onElement.classList.add('btnOnOffActive')
    offElement.classList.remove('btnOnOffActive')
    socket.emit('light', {
      group: group,
      mode: true,
      sync: false,
      timer: -1,
    })
    socketCounter('socCountOut')
  })

  offElement.addEventListener('click', function() {
    onElement.classList.remove('btnOnOffActive')
    offElement.classList.add('btnOnOffActive')
    socket.emit('light', {
      group: group,
      mode: false,
      sync: false,
      timer: -1,
    })
    socketCounter('socCountOut')
  })
  socket.emit('light', {
    group: group,
    mode: false,
    sync: true, // request current value, to sync with other sockets
    timer: -1,
  })
  socketCounter('socCountOut')
}

function timeRemainingReadable(milliseconds) {
  // timers in the past are displayed as zeros
  // so a reset timer (= 0) is displayed as zeros as well
  function two(number) {
    if (number < 10) {
      return '0' + number.toString()
    } else {
      return number.toString()
    }
  }
  let milliSecondsLeft = milliseconds - Date.now()
  if (milliSecondsLeft < 1) {
    milliSecondsLeft = 0
  }
  const hours = Math.floor(milliSecondsLeft / (60 * 60 * 1000))
  milliSecondsLeft = milliSecondsLeft % (60 * 60 * 1000)
  const minutes = Math.floor(milliSecondsLeft / (60 * 1000))
  milliSecondsLeft %= 60 * 1000
  const secondsLeft = Math.floor(milliSecondsLeft / 1000)
  return `${two(hours)}:${two(minutes)}:${two(secondsLeft)}`
}

function setTimeReadable(milliseconds) {
  if (milliseconds - Date.now() < 1) {
    return 'timer not set'
  }
  // use the moment library
  return moment(milliseconds).format('dddd hh:mm:ss')
}

function refreshTimerDisplays(group) {
  const timerDisplay = document.getElementById(group + 'Timer')
  const alarmDisplay = document.getElementById(group + 'Alarm')

  if (timerDisplay != undefined) {
    timerDisplay.innerHTML = timeRemainingReadable(timers[group])
  }
  if (alarmDisplay != undefined) {
    alarmDisplay.innerHTML = setTimeReadable(timers[group])
  }
}

function broadcastTimer(group) {
  socket.emit('light', {
    group: group, //TODO: try group
    sync: false,
    mode: false,
    timer: timers[group],
  })
  socketCounter('socCountOut')
}

function changeTimer(group, milliseconds) {
  if (timers[group] == 0) {
    // timer not set, assume prev timer set for Date.now()
    timers[group] = Date.now()
  }
  timers[group] += milliseconds
  console.log(`timers[group]: ${timers[group]}`)
  refreshTimerDisplays(group)
  broadcastTimer(group)
}

function cancelTimer(group) {
  timers[group] = 0
  refreshTimerDisplays(group)
  broadcastTimer(group)
}

function addTimerEvents(group) {
  for (const key in timeAdjustments) {
    var adjustElement = document.getElementById(group + key)
    if (adjustElement != undefined) {
      adjustElement.addEventListener('click', function() {
        changeTimer(group, timeAdjustments[key])
      })
    }
  }
  document
    .getElementById(group + 'Cancel')
    .addEventListener('click', function() {
      cancelTimer(group)
    })
}

function runTimer(group) {
  var timerId = setInterval(() => {
    if (timers[group] > 0) {
      refreshTimerDisplays(group)
    }
  }, 1000)
  return timerId
}

window.addEventListener('load', function() {
  // old "load" event, even all images will have loaded
  // NOTE: you can click the on or off buttons even if they are "on"
  let groups: {} = {}
  const xhttp = new XMLHttpRequest()
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      groups = JSON.parse(xhttp.responseText)
      console.log(`groups : ${JSON.stringify(groups)}`)

      addBtnEvent('officelight')
      addBtnEvent('livingroom')
      addBtnEvent('filter')
      addTimerEvents('livingroom')
      addTimerEvents('officelight')
      const livingroomTimerId = runTimer('livingroom')
      const officelightTimerId = runTimer('officelight')
      // clearInterval(timerId) // EXAMPLE: stop the timer
      // socketCounter('socCountOut')
    }
  }
  xhttp.open('POST', '', true)
  xhttp.send()
})

socket.on('light', function(socketData) {
  socketCounter('socCountIn')
  if (socketData.sync || socketData.timer < 0) {
    switchButton(socketData)
  }
  if (socketData.sync || socketData.timer >= 0) {
    timers[socketData.group] = socketData.timer
    refreshTimerDisplays(socketData.group)
  }
})
