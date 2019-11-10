import * as events from 'events'
const eventEmitter = new events.EventEmitter()

import * as socketio from 'socket.io'

import { PythonShell, Options } from 'python-shell'

interface SocketData {
  group: string
  sync: boolean
  mode: boolean
  timer: number
}

export class Outlets {
  private io
  public socketName: string

  private onOutlets
  constructor(http, socketName) {
    this.io = socketio(http) // require socket.io module
    this.socketName = socketName
    this.onOutlets = new Set([])
    this.io.sockets.on('connection', socket => {
      socket.on(this.socketName, (socketData: SocketData) => {
        console.log(`Server socket.on`)
        console.log(`  socketData.group: ${socketData.group}`)
        console.log(`  socketData.sync: ${socketData.sync}`)
        console.log(`  socketData.mode: ${socketData.mode}`)
        console.log(`  socketData.timer: ${socketData.timer}`)
        if (socketData.sync) {
          // light sync requested
          const returnData: SocketData = {
            group: socketData.group,
            sync: false,
            mode: false,
            timer: -1,
          }
          returnData.mode = this.onOutlets.has(socketData.group)
          // only emit to current socket.
          socket.emit(this.socketName, returnData)
        } else if (socketData.timer >= 0) {
          socket.broadcast.emit(this.socketName, socketData)
          // do something with set timer TODO *****
        } else {
          // always send light signal, even if server thinks the modes match
          this.switch(socketData.group, socketData.mode)
          // emit to all OTHER sockets.
          socket.broadcast.emit(this.socketName, socketData)
        }
      })
    })
  }

  public switch(group: string, mode: boolean) {
    let modeString = mode ? 'on' : 'off'
    let options: Options = {
      mode: 'text',
      pythonPath: '/usr/bin/python3',
      scriptPath: '/home/pi/Programming/Automation/executables',
      args: [group, modeString, '--attempts', '3'],
    }
    if (mode) {
      this.onOutlets.add(group)
    } else {
      this.onOutlets.delete(group)
    }
    eventEmitter.emit('groupChangedEvent' + group)
    PythonShell.run('rfoutlets_switch_group.py', options, function(
      err,
      results
    ) {
      if (err) throw err
      // console.log()
      // console.log(`PythonShell:`)
      // console.log(`  results: ${results}`)
      // console.log(`  modeString: ${modeString}`)
      // console.log(`  group: ${group}`)
      // console.log()
    })
  }

  public groupOn(group): boolean {
    return this.onOutlets.has(group)
  }

  public emit(group: string, mode: boolean): void {
    const returnData: SocketData = {
      group,
      sync: false,
      mode,
      timer: -1,
    }
    // console.log(`emit\n  returnData: ${returnData.group}`)
    this.io.emit(this.socketName, returnData)
  }

  public toggle(group: string): boolean {
    let nextMode: boolean = !this.groupOn(group)
    this.emit(group, nextMode)
    this.switch(group, nextMode)
    return nextMode
  }

  public watch(group: string, callback: { (test: string): void }): void {
    eventEmitter.on('groupChangedEvent' + group, callback)
  }
}
