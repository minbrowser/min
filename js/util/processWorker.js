const { spawnSync } = require('child_process')

onmessage = function (e) {
  const taskId = e.data.taskId
  const command = e.data.command
  const args = e.data.args
  const input = e.data.input
  try {
    const process = spawnSync(command, args, {input: input, encoding: 'utf8'})
    postMessage({taskId: taskId, result: process.output[1].slice(0, -1)})
  } catch (e) {
    postMessage({taskId: taskId, error: e.toString()})
  }
}
