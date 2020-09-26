/*
Helper class to control child process output.
Bufferizes output from stdout and stderr, waits until the process exits,
and then resolves the promise with gathered data.
*/

const { spawn, spawnSync } = require('child_process')

const worker = new Worker('js/util/processWorker.js');

let processPath = process.env.PATH

// we need to locate the op binary in this directory on macOS - see https://github.com/minbrowser/min/issues/1028
// normally, it is present in the path when running in development, but not when the app is launched after being packaged
if (platformType === "mac" && !processPath.includes("/usr/local/bin")) {
  processPath += ':/usr/local/bin'
}

const customEnv = Object.assign({}, process.env, {PATH: processPath})

//see https://github.com/minbrowser/min/issues/1028#issuecomment-647235653
const maxBufferSize = 25 * 1024 * 1024

class ProcessSpawner {
  constructor(command, args) {
    this.command = command
    this.args = args
    this.data = ""
    this.error = ""
  }

  async execute() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.command, this.args, { env: customEnv, maxBuffer: maxBufferSize })

      process.stdout.on('data', (data) => {
        this.data += data
      })

      process.stderr.on('data', (data) => {
        this.error += data
      })

      process.on('close', (code) => {
        if (code !== 0) {
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

  executeSync(input) {
    const process = spawnSync(this.command, this.args, { input: input, encoding: "utf8", env: customEnv, maxBuffer: maxBufferSize })
    return process.output[1].slice(0, -1)
  }

  executeSyncInAsyncContext(input) {
    return new Promise((resolve, reject) => {
      let taskId = Math.random();
      worker.onmessage = function (e) {
        if (e.data.taskId === taskId) {
          if (e.data.error) {
            reject(e.data.error)
          } else {
            resolve(e.data.result);
          }
        }
      }
      worker.postMessage({
        command: this.command,
        args: this.args,
        input: input,
        customEnv: customEnv,
        maxBuffer: maxBufferSize,
        taskId: taskId,
      })
    })
  }

  checkCommandExists() {
    return new Promise((resolve, reject) => {
      const checkCommand = (platformType === "windows") ? 'where' : 'which'
      const process = spawn(checkCommand, [this.command], { env: customEnv })

      process.stdout.on('data', (data) => {
        if (data.length > 0) {
          resolve(true)
        }
      })

      process.on('close', (code) => {
        //if we didn't get any output, the command doesn't exist
        resolve(false)
      })

      process.on('error', (data) => {
        resolve(false)
      })
    })
  }
}

module.exports = ProcessSpawner
