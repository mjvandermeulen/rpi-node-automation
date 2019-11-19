import * as events from 'events'
const eventEmitter = new events.EventEmitter()

import * as socketio from 'socket.io'

import { PythonShell, Options } from 'python-shell'

interface SocketData {
  // this is ambiguous:
  // how to know if mode needs to be changed?
  // currently: if sync || timer < 0 UGLY
  // TODO *** split in different socket channels?
  group: string
  sync: boolean
  mode: boolean
  timer: number
}

interface Timer {
  time: number // milliseconds since Epoch
  timeOutObject: null | NodeJS.Timeout // setTimeOut returns an object in Node!!!
}

interface GroupSetting {
  displayName: string
  defaultTimer: number
}

// LEARN ***
export interface GroupsSettings {
  [key: string]: GroupSetting
}

interface Group {
  mode: boolean
  timer: Timer
}

interface Groups {
  [key: string]: Group
}

export class Outlets {
  private io: SocketIO.Server
  public channel: string

  private groups: Groups

  constructor(server: any, channel: string, groupsSettings: GroupsSettings) {
    this.io = socketio(server)
    this.channel = channel
    this.groups = {}
    for (const groupSetting in groupsSettings) {
      this.groups[groupSetting] = {
        mode: false,
        timer: {
          time: groupsSettings[groupSetting].defaultTimer,
          timeOutObject: null,
        },
      }
    }
    this.groups
    this.io.sockets.on('connection', (socket: any) => {
      socket.on(this.channel, (socketData: SocketData) => {
        // console.log(`socket.on JSON socket.data: ${JSON.stringify(socketData)}`)
        if (socketData.sync) {
          // light sync requested
          const returnData: SocketData = {
            group: socketData.group,
            sync: true,
            mode: this.groups[socketData.group].mode,
            timer: this.groups[socketData.group].timer.time,
          }
          // only emit to current socket.
          socket.emit(this.channel, returnData)
        } else if (socketData.timer >= 0) {
          socket.broadcast.emit(this.channel, socketData)
          // TODO change to this.timerChangeRequestWithBroadcast(....)
          // see i.e.: this.switchRequestWithBroadcast
          this.updateTimer(socketData.group, socketData.timer)
        } else {
          // always send light signal, even if server thinks the modes match
          this.switchRequestWithBroadcast(
            socketData.group,
            socketData.mode,
            socket
          )
        }
      })
    })
  }

  private resetTimer(group: string): void {
    // resetTimer VS cancelTimerRequest
    // resetTimer:
    //   stops the setTimeOut on the server
    //   resets the timer to 0
    console.log(`resetTimer group: ${group}`)
    // if (this.groups[group] != undefined) {
    //   // DANG I can skip the undefined!!!! LEARN **** because of typescript!!!
    //   if (
    //     this.groups[group].timer.timeOutObject != undefined &&
    //     // if coded properly timeOutObject != undefined check is redundant
    if (this.groups[group].timer.timeOutObject != null) {
      clearTimeout(this.groups[group].timer.timeOutObject as NodeJS.Timeout)
      // LEARN typescript type assertion: "as"
      // I can do this after the null check. ****
      // LEARN **** https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types
    }
    const resetTimer: Timer = {
      time: 0,
      timeOutObject: null,
    }
    this.groups[group].timer = resetTimer
  }

  private timerTimeOutCallback(group: string): void {
    this.groups[group].timer.timeOutObject = null // useless???? solve later in function
    let t: Timer = this.groups[group].timer
    let timeLeft = t.time - Date.now()
    if (timeLeft < 100) {
      // time to fire the timer
      this.toggleRequest(group)
      this.cancelTimerRequest(group)
    } else if (timeLeft < 1000) {
      t.timeOutObject = setTimeout(() => {
        this.timerTimeOutCallback(group)
      }, timeLeft)
    } else {
      // MAKE DRY TODO **** see above and below below
      let halfTime = Math.floor(timeLeft) / 2
      t.timeOutObject = setTimeout(() => {
        this.timerTimeOutCallback(group)
      }, halfTime)
    }
  }

  private updateTimer(group: string, time: number): void {
    let currentTimer: Timer = this.groups[group].timer
    if (time === 0) {
      // timer cancel requested
      this.cancelTimerRequest(group)
    } else if (
      time - Date.now() < 0 &&
      // next time set in the past
      (currentTimer == undefined || currentTimer.time == 0)
      // timer not set
    ) {
      console.log('CAN NOT START A TIMER IN THE PAST')
      // you can't start a new timer in the past
      // this.resetTimer(group) // not needed: see condition
    } else {
      this.resetTimer(group)
      // check status of current timer nerdily
      // in half the time it's set for
      let halfTime = Math.floor(time - Date.now()) / 2

      let iD = setTimeout(() => {
        this.timerTimeOutCallback(group)
      }, halfTime)
      const nextTimer = {
        time,
        timeOutObject: iD,
      }
      this.groups[group].timer = nextTimer
    }
  }

  private switch(group: string, mode: boolean): void {
    console.log(`switch group: ${group} mode: ${mode}`)
    let modeString = mode ? 'on' : 'off'
    let options: Options = {
      mode: 'text',
      pythonPath: '/usr/bin/python3',
      scriptPath: '/home/pi/Programming/Automation/executables',
      args: [group, modeString, '--attempts', '3'],
    }
    this.groups[group].mode = mode
    eventEmitter.emit('groupChangedEvent' + group)

    PythonShell.run('rfoutlets_switch_group.py', options, function(
      err,
      results
    ) {
      if (err) throw err
      // console.log(`\nPythonShell:`)
      // console.log(`  results: ${results}`)
      // console.log(`  modeString: ${modeString}`)
      // console.log(`  group: ${group}\n`)
    })
  }

  private emitCancelTimer(group: string): void {
    const data: SocketData = {
      group,
      sync: false,
      mode: false,
      timer: 0,
    }
    this.io.emit(this.channel, data)
  }

  private emitSwitch(group: string, mode: boolean): void {
    const returnData: SocketData = {
      group,
      sync: false,
      mode,
      timer: -1,
    }
    // console.log(`emitSwitch\n  returnData: ${returnData.group}`)
    this.io.emit(this.channel, returnData)
  }

  private broadcastSwitch(group: string, mode: boolean, socket: any): void {
    console.log(`broadcastSwitch group: ${group} mode: ${mode}`)
    // broadcasting goes to all OTHER sockets ONLY
    const returnData: SocketData = {
      group,
      sync: false,
      mode,
      timer: -1,
    }
    socket.broadcast.emit(this.channel, returnData)
  }

  private switchRequestWithBroadcast(
    group: string,
    mode: boolean,
    socket: any
  ): void {
    console.log(`switchRequestWithBroadcast group: ${group} mode: ${mode}`)
    this.broadcastSwitch(group, mode, socket)
    this.switch(group, mode)
  }

  public cancelTimerRequest(group: string): void {
    // cancelTimerRequest VS resetTimer (see notes there)
    // cancelTimerRequest:
    //   calls resetTimer
    //   emits the cancelled timer to all sockets
    console.log(`cancelTimerRequest group: ${group}`)
    this.resetTimer(group)
    this.emitCancelTimer(group)
  }

  public groupOn(group: string): boolean {
    return this.groups[group].mode // ***** TODO this is useless now.... refactor
  }

  public toggleRequest(group: string): boolean {
    console.log(`toggleRequest group: ${group}`)
    let nextMode: boolean = !this.groupOn(group)
    this.emitSwitch(group, nextMode)
    this.switch(group, nextMode)
    return nextMode
  }

  public watch(group: string, callback: { (test: string): void }): void {
    eventEmitter.on('groupChangedEvent' + group, callback)
  }
}
