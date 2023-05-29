/* Simple input prompt. */

let promptAnswer
let promptOptions

function createPrompt (options) {
  promptOptions = options
  const { parent, width = 360, height = 140 } = options

  return new Promise(resolve => {
    let promptWindow = new BrowserWindow({
      width: width,
      height: height,
      parent: parent != null ? parent : windows.getCurrent(),
      show: false,
      modal: true,
      alwaysOnTop: true,
      title: options.title,
      autoHideMenuBar: true,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        sandbox: false,
        contextIsolation: false
      }
    })

    promptWindow.on('closed', () => {
      promptWindow = null
      resolve(promptAnswer)
    })

    // Load the HTML dialog box
    promptWindow.loadURL('file://' + __dirname + '/pages/prompt/index.html')
    promptWindow.once('ready-to-show', () => { promptWindow.show() })
  })
}

ipc.on('show-prompt', async (options, callback) => {
  const result = await createPrompt(options)
  callback(result)
})

ipc.on('open-prompt', event => {
  event.returnValue = JSON.stringify({
    label: promptOptions.text,
    ok: promptOptions.ok,
    values: promptOptions.values,
    cancel: promptOptions.cancel,
    darkMode: settings.get('darkMode')
  })
})

ipc.on('close-prompt', (event, data) => {
  promptAnswer = data
})

ipc.on('prompt', async (event, data) => {
  event.returnValue = await createPrompt(data)
})
