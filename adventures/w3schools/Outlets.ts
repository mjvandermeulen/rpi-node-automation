import * as socketio from 'socket.io'

import { PythonShell, Options } from 'python-shell'

interface SocketData {
  group: string
  value: number
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
      console.log(`this.io.sockets.on .....`)
      socket.on(this.socketName, (socketData: SocketData) => {
        let currentValue = this.onOutlets.has(socketData.group) ? 1 : 0
        console.log(`Server socket.on`)
        console.log(`  currentValue: ${currentValue}`)
        console.log(`  socketData.group: ${socketData.group}`)
        console.log(`  socketData.value: ${socketData.value}`)

        const returnData: SocketData = {
          group: socketData.group,
          value: currentValue,
        }
        if (socketData.value === -1) {
          // light sync requested
          // only emit to current socket.
          returnData.value = currentValue
          socket.emit(this.socketName, returnData)
        } else {
          // always send light signal, even if server thinks the modes match
          this.switch(socketData.group, socketData.value === 1)
          // emit to all sockets, except the current one
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
      args: [group, modeString, '--attempts', '1'],
    }
    if (mode) {
      this.onOutlets.add(group)
    } else {
      this.onOutlets.delete(group)
    }
    PythonShell.run('rfoutlets_switch_group.py', options, function(
      err,
      results
    ) {
      if (err) throw err
      console.log()
      console.log(`PythonShell:`)
      console.log(`  results: ${results}`)
      console.log(`  modeString: ${modeString}`)
      console.log(`  group: ${group}`)
      console.log()
    })
  }

  public groupOn(group): boolean {
    return this.onOutlets.has(group)
  }

  // public toggle(group: string): boolean {
  //   let nextMode: boolean = !this.groupOn(group)
  //   this.switch(group, nextMode)
  //   return nextMode
  // }

  public emit(group: string, mode: boolean): void {
    const returnData: SocketData = {
      group: group,
      value: mode ? 1 : 0,
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
}
