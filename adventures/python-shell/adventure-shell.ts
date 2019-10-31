import { PythonShell } from 'python-shell'

let options = {
  mode: 'text',
  pythonPath: '/usr/bin/python3',
  scriptPath: '/home/pi/Programming/Automation/executables',
  args: ['10', 'on'],
}

PythonShell.run('rfoutlets_switch_group.py', options, function(err, results) {
  if (err) throw err
  console.log(`results: ${results}`)
})
