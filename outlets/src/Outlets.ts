import * as events from 'events'
const eventEmitter = new events.EventEmitter()

import * as socketio from 'socket.io'

import { PythonShell, Options } from 'python-shell'
import { GroupsSettings } from './group-settings'

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
    for (const groupKey in groupsSettings) {
      if (groupsSettings[groupKey].enabled) {
        this.groups[groupKey] = {
          mode: false,
          timer: {
            time: groupsSettings[groupKey].defaultTimer,
            timeOutObject: null,
          },
        }
      }
    }
    this.groups
    this.io.sockets.on('connection', (socket: socketio.Socket) => {
      socket.on(this.channel, (socketData: SocketData) => {
        console.log(`socket.on JSON socket.data: ${JSON.stringify(socketData)}`)
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
          // TODO change to this.timerChangeRequestWithBroadcast(....)
          // see i.e.: this.switchAndBroadcastRequest
          this.timerUpdateAndBroadcastRequest(
            socket,
            socketData.group,
            socketData.timer
          )
        } else {
          // always send light signal, even if server thinks the modes match
          this.switchAndBroadcastRequest(
            socketData.group,
            socketData.mode,
            socket
          )
        }
      })
    })
  }

  private setTimer(group: string, time: number): void {
    // setTimer VS cancelTimerRequest (see notes there)
    // setTimer:
    //   stops the setTimeOut on the server
    //   resets the timer to 0 on the server
    console.log(`setTimer group: ${group}`)
    if (this.groups[group].timer.timeOutObject != null) {
      clearTimeout(this.groups[group].timer.timeOutObject as NodeJS.Timeout)
      // LEARN typescript type assertion: "as"
      // I can do this after the null check. ****
      // LEARN **** https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types
    }
    const setTimer: Timer = {
      time,
      timeOutObject: null,
    }
    this.groups[group].timer = setTimer
  }

  private runTimer(group: string): void {
    let timer: Timer = this.groups[group].timer
    const timeLeft = timer.time - Date.now()
    if (timeLeft < 100) {
      // time to fire the timer
      this.toggleRequest(group)
      this.cancelTimerRequest(group)
    } else if (timeLeft < 1000) {
      timer.timeOutObject = setTimeout(() => {
        this.runTimer(group)
      }, timeLeft)
    } else {
      let halfTime = Math.floor(timeLeft) / 2
      timer.timeOutObject = setTimeout(() => {
        this.runTimer(group)
      }, halfTime)
    }
  }

  private timerBroadcast(
    socket: SocketIO.Socket,
    group: string,
    timer: number,
    emitAll = false
  ): void {
    const socketData: SocketData = {
      group,
      sync: false,
      mode: false,
      timer,
    }
    if (emitAll) {
      this.io.emit(this.channel, socketData)
    } else {
      socket.broadcast.emit(this.channel, socketData)
    }
  }

  private timerUpdateAndBroadcastRequest(
    socket: socketio.Socket,
    group: string,
    time: number
  ): void {
    let currentTimer: Timer = this.groups[group]?.timer
    if (time === 0) {
      this.cancelTimerRequest(group)
    } else if (
      time - Date.now() < 0 &&
      (currentTimer == undefined || currentTimer.time == 0)
    ) {
      // NEW timer set in the past
      this.timerBroadcast(socket, group, 0, true)
    } else {
      // time could be pushed back into the past.
      this.timerBroadcast(socket, group, time, false)
      this.setTimer(group, time)
      this.runTimer(group)
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

  private broadcastSwitch(
    group: string,
    mode: boolean,
    socket: socketio.Socket
  ): void {
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

  private switchAndBroadcastRequest(
    group: string,
    mode: boolean,
    socket: socketio.Socket
  ): void {
    console.log(`switchAndBroadcastRequest group: ${group} mode: ${mode}`)
    this.broadcastSwitch(group, mode, socket)
    this.switch(group, mode)
  }

  public cancelTimerRequest(group: string): void {
    // cancelTimerRequest VS setTimer (see notes there)
    // cancelTimerRequest:
    //   calls setTimer
    //   emits the cancelled timer to all sockets
    console.log(`cancelTimerRequest group: ${group}`)
    this.setTimer(group, 0)
    this.emitCancelTimer(group)
  }

  public groupOn(group: string): boolean {
    return this.groups[group].mode // *** TODO this is useless now.... refactor
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
