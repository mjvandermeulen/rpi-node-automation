import { PythonShell, Options } from 'python-shell'

interface SocketData {
  group: string
  value: number
}

export class Outlets {
  private onOutlets
  constructor(io, socketName) {
    this.onOutlets = new Set([])
    io.sockets.on('connection', socket => {
      socket.on(socketName, (socketData: SocketData) => {
        let currentValue = this.onOutlets.has(socketData.group) ? 1 : 0

        const returnData: SocketData = {
          group: socketData.group,
          value: currentValue,
        }
        console.log(`Server socket.on`)
        console.log(`  currentValue: ${currentValue}`)
        console.log(`  socketData.group: ${socketData.group}`)
        console.log(`  socketData.value: ${socketData.value}`)
        if (socketData.value === -1) {
          // light sync requested
          // only emit to current socket.
          returnData.value = currentValue
          socket.emit(socketName, returnData)
        } else {
          // always send light signal, even if server thinks the modes match
          this.switch(socketData.group, socketData.value === 1)
          // emit to all sockets, except the current one
          socket.broadcast.emit(socketName, socketData)
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
}
