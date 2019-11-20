// CDN packages
declare const io: any
declare const moment: any

const socket = io() // load socket.io-client and connect to the host that serves the page

// *** LEARN not sure how to do this with interface...
// ??? capitalize?
type Groups = string[]
// **** could you just import socketData from outlets, since it's for
// typescript purposes only?
interface SocketData {
  group: string
  sync: boolean
  mode: boolean
  timer: number
}

// Old and obsolete, see timeAdjustments
// interface Adjustments {
//   plus: number
//   plusplus: number
//   minus: number
//   minusminus: number
// }

// let groups: Groups
const timers: { [key: string]: number } = {}

// all times in milliseconds
const smallAdjustment: number = 5 * 1000
const largeAdjustment: number = 30 * 60 * 1000

const timeAdjustments: { [key: string]: number } = {
  plus: smallAdjustment,
  plusplus: largeAdjustment,
  minus: -smallAdjustment,
  minusminus: -largeAdjustment,
}

function socketCounter(spanId: string): void {
  const counter = document.getElementById(spanId)
  if (counter != undefined) {
    const c = parseInt(counter.innerHTML) + 1
    counter.innerHTML = c.toString()
  }
}

function switchButton(data: SocketData): void {
  // change from data to group and mode TODO ***
  var onElement = document.getElementById(data.group + 'On')
  var offElement = document.getElementById(data.group + 'Off')
  if (onElement != undefined && offElement != undefined) {
    if (data.mode) {
      onElement.classList.add('btnOnOffActive')
      offElement.classList.remove('btnOnOffActive')
    } else {
      onElement.classList.remove('btnOnOffActive')

      offElement.classList.add('btnOnOffActive')
    }
  }
}

function addBtnEvents(groups: Groups): void {
  groups.forEach(group => {
    var onElement = document.getElementById(group + 'On')
    var offElement = document.getElementById(group + 'Off')
    if (onElement != undefined && offElement != undefined) {
      onElement.addEventListener('click', () => {
        if (onElement != undefined && offElement != undefined) {
          onElement.classList.add('btnOnOffActive')
          offElement.classList.remove('btnOnOffActive')
          socket.emit('light', {
            group: group,
            mode: true,
            sync: false,
            timer: -1,
          })
          socketCounter('socCountOut')
        }
      })

      offElement.addEventListener('click', () => {
        if (onElement != undefined && offElement != undefined) {
          onElement.classList.remove('btnOnOffActive')
          offElement.classList.add('btnOnOffActive')
          socket.emit('light', {
            group: group,
            mode: false,
            sync: false,
            timer: -1,
          })
          socketCounter('socCountOut')
        }
      })

      // synchronize
      socket.emit('light', {
        group: group,
        mode: false,
        sync: true, // request current value, to sync with other sockets
        timer: -1,
      })
      socketCounter('socCountOut')
    }
  })
}

function timeRemainingReadable(milliseconds: number): string {
  // timers in the past are displayed as zeros
  // so a reset timer (= 0) is displayed as zeros as well
  function two(number: number) {
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

function setTimeReadable(milliseconds: number): string {
  if (milliseconds - Date.now() < 1) {
    return 'timer not set'
  }
  // use the moment library
  return moment(milliseconds).format('dddd hh:mm:ss')
}

function refreshTimerDisplays(group: string) {
  const timerDisplay = document.getElementById(group + 'Timer')
  const alarmDisplay = document.getElementById(group + 'Alarm')
  if (timerDisplay != undefined) {
    timerDisplay.innerHTML = timeRemainingReadable(timers[group])
  }
  if (alarmDisplay != undefined) {
    alarmDisplay.innerHTML = setTimeReadable(timers[group])
  }
}

function broadcastTimer(group: string) {
  socket.emit('light', {
    group: group, //TODO: try group
    sync: false,
    mode: false,
    timer: timers[group],
  })
  socketCounter('socCountOut')
}

function changeTimer(group: string, milliseconds: number) {
  if (timers[group] == 0) {
    // timer not set, assume prev timer set for Date.now()
    timers[group] = Date.now()
  }
  timers[group] += milliseconds
  refreshTimerDisplays(group)
  broadcastTimer(group)
}

function cancelTimer(group: string) {
  timers[group] = 0
  refreshTimerDisplays(group)
  broadcastTimer(group)
}

function addTimerEvents(groups: Groups) {
  groups.forEach(group => {
    for (const key in timeAdjustments) {
      const adjustElement = document.getElementById(group + key)
      if (adjustElement != undefined) {
        adjustElement.addEventListener('click', function() {
          changeTimer(group, timeAdjustments[key])
        })
      }
    }
    document
      .getElementById(group + 'Cancel')
      ?.addEventListener('click', function() {
        cancelTimer(group)
      })
  })
}

function runTimer(group: string) {
  const timerId = setInterval(() => {
    if (timers[group] > 0) {
      refreshTimerDisplays(group)
    }
  }, 1000)
  return timerId
}

window.addEventListener('load', function() {
  // old "load" event, even all images will have loaded
  // NOTE: you can click the on or off buttons even if they are "on"
  const xhttp = new XMLHttpRequest()
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      const groups = JSON.parse(xhttp.responseText)
      // init timers
      groups.forEach((group: string) => {
        timers[group] = 0
      })

      addBtnEvents(groups)
      addTimerEvents(groups)
      // TODO ******
      // const livingroomTimerId = runTimer('livingroom')
      // const officelightTimerId = runTimer('officelight')
      // clearInterval(timerId) // EXAMPLE: stop the timer
      // socketCounter('socCountOut')
    }
  }
  xhttp.open('GET', 'data/groups', true)
  xhttp.send()
})

socket.on('light', function(socketData: SocketData) {
  socketCounter('socCountIn')
  if (socketData.sync || socketData.timer < 0) {
    switchButton(socketData)
  }
  if (socketData.sync || socketData.timer >= 0) {
    timers[socketData.group] = socketData.timer
    refreshTimerDisplays(socketData.group)
  }
})
