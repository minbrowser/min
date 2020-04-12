onmessage = function (e) {
  const command = e.data.command
  const args = e.data.args
  const input = e.data.input
  try {
    const process = require('child_process').spawnSync(command, args, {input: input, encoding: 'utf8'})
    postMessage({result: process.output[1].slice(0, -1)})
  } catch (e) {
    postMessage({error: e.toString()})
  }
}
