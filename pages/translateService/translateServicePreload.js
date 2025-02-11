// https://www.electronjs.org/docs/latest/tutorial/message-ports#communicating-directly-between-the-main-process-and-the-main-world-of-a-context-isolated-page

const { ipcRenderer } = require('electron')

const windowLoaded = new Promise(resolve => {
  window.onload = resolve
})

ipcRenderer.on('page-translation-session-create', async (event) => {
  await windowLoaded
  window.postMessage('page-translation-session-create', '*', event.ports)
})
