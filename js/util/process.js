/*
Helper class to control child process output.
Bufferizes output from stdout and stderr, waits until the process exits,
and then resolves the promise with gathered data.
*/

const { spawn } = require('child_process')

class ProcessSpawner {
  constructor(command, args) {
    this.command = command
    this.args = args
    this.data = ""
    this.error = ""
  }

  async execute() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.command, this.args)
      
      process.stdout.on('data', (data) => {
        this.data += data
      })
    
      process.stderr.on('data', (data) => {
        this.error += data
      })

      process.on('close', (code) => {
        if (code != 0) {
          reject({ error: this.error, data: this.data })
        } else {
          resolve(this.data)
        }
      })
      
      process.on('error', (data) => {
        reject({ error: data })
      })
    })
  }
}

module.exports = ProcessSpawner
