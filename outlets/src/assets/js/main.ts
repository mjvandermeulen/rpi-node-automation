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

class Timers {
  private smallAdjustment: number = 5 * 1000
  private largeAdjustment: number = 30 * 60 * 1000
  private timeAdjustments: { [key: string]: number } = {
    plus: this.smallAdjustment,
    plusplus: this.largeAdjustment,
    minus: -this.smallAdjustment,
    minusminus: -this.largeAdjustment,
  }
  private timers: { [key: string]: number }

  constructor() {
    this.timers = {}

    // this.addTimerEvents()
    // this.runTimers()
  }
  public setTimerGroups(groups: Groups) {
    groups.forEach(groupKey => {
      this.timers[groupKey] = 0
    })
  }

  public addTimerEvents() {
    for (const timerKey in this.timers) {
      for (const key in this.timeAdjustments) {
        const adjustElement = document.getElementById(timerKey + key)
        if (adjustElement != null) {
          // getElementById returns null
          adjustElement.addEventListener('click', () => {
            this.changeTimer(timerKey, this.timeAdjustments[key])
          })
        }
      }
      document
        .getElementById(timerKey + 'Cancel')
        ?.addEventListener('click', () => {
          this.cancelTimer(timerKey)
        })
    }
  }

  private refreshTimerDisplays(group: string) {
    const timerDisplay = document.getElementById(group + 'Timer')
    const alarmDisplay = document.getElementById(group + 'Alarm')
    if (timerDisplay != null) {
      // ***** LEARN getElementById returns null
      timerDisplay.innerHTML = timeRemainingReadable(this.timers[group])
    }
    if (alarmDisplay != null) {
      alarmDisplay.innerHTML = setTimeReadable(this.timers[group])
    }
  }

  // ***** NodeJS.Timeout is bogus: The client is not in Node JS but "Browser JS"
  public runTimers(): NodeJS.Timeout {
    // WRONG NAME: better: **** startRefreshTimersInterval
    // Check all Timers every second TODO: setInterval to top of second.
    // Tricky since you can't set a timeout till top of the second and still
    // return the timerId

    const timerId: NodeJS.Timeout = setInterval(() => {
      for (const timerKey in this.timers) {
        if (this.timers[timerKey] > 0) {
          this.refreshTimerDisplays(timerKey)
        }
      }
    }, 1000)
    return timerId
  }

  private changeTimer(group: string, milliseconds: number) {
    if (this.timers[group] == 0) {
      // timer not set, assume prev timer set for Date.now()
      this.timers[group] = Date.now()
    }
    this.timers[group] += milliseconds
    this.refreshTimerDisplays(group)
    this.broadcastTimer(group)
  }

  private cancelTimer(group: string) {
    this.timers[group] = 0
    this.refreshTimerDisplays(group)
    this.broadcastTimer(group)
  }

  private broadcastTimer(group: string) {
    socket.emit('light', {
      group: group, //TODO: try group
      sync: false,
      mode: false,
      timer: this.timers[group],
    })
    socketCounter('socCountOut')
  }

  public processSocketData(socketData: SocketData) {
    this.timers[socketData.group] = socketData.timer
    this.refreshTimerDisplays(socketData.group)
  }
}

let timers: Timers = new Timers() // ***** change name: same as timers.timers

function socketCounter(spanId: string): void {
  const counter = document.getElementById(spanId)
  if (counter != null) {
    const c = parseInt(counter.innerHTML) + 1
    counter.innerHTML = c.toString()
  }
}

function switchButton(data: SocketData): void {
  // change from data to group and mode TODO ***
  var onElement = document.getElementById(data.group + 'On')
  var offElement = document.getElementById(data.group + 'Off')
  if (onElement != null && offElement != null) {
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
    if (onElement != null && offElement != null) {
      onElement.addEventListener('click', () => {
        if (onElement != null && offElement != null) {
          // checked twice to stop Typescript from complaining...
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
        if (onElement != null && offElement != null) {
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

window.addEventListener('load', function() {
  // old "load" event, even all images will have loaded
  // NOTE: you can click the on or off buttons even if they are selected
  const xhttp = new XMLHttpRequest()
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      const groups = JSON.parse(xhttp.responseText)

      addBtnEvents(groups)
      timers.setTimerGroups(groups)
      timers.addTimerEvents()
      timers.runTimers()
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
    timers.processSocketData(socketData)
  }
})
