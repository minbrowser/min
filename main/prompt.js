/* Simple input prompt. */

var promptAnswer
var promptOptions

function createPrompt (options, callback) {
  promptOptions = options
  let { parent, width = 360, height = 140 } = options

  var promptWindow = new BrowserWindow({
    width: width,
    height: height,
    parent: parent != null ? parent : mainWindow,
    show: false,
    modal: true,
    alwaysOnTop : true,
    title : options.title,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      sandbox: false
    }
  })

  promptWindow.on('closed', () => {
    promptWindow = null
    callback(promptAnswer)
  })

  // Load the HTML dialog box
  promptWindow.loadURL('file://' + __dirname + '/pages/prompt/index.html')
  promptWindow.once('ready-to-show', () => { promptWindow.show() })
}

ipc.on('show-prompt', function (options, callback) {
  createPrompt(options, callback)
})

ipc.on('open-prompt', function (event) {
  event.returnValue = JSON.stringify({
    label: promptOptions.text,
    ok: promptOptions.ok,
    values: promptOptions.values,
    cancel: promptOptions.cancel,
    darkMode: settings.get('darkMode')
  })
})

ipc.on('close-prompt', function (event, data) {
  promptAnswer = data
})

ipc.on('prompt', function (event, data) {
  createPrompt(data, function (result) {
    event.returnValue = result
  })
})
