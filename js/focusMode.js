var isFocusMode = false

ipc.on('enterFocusMode', function () {
  isFocusMode = true
  document.body.classList.add('is-focus-mode')

  setTimeout(function () { // wait to show the message until the tabs have been hidden, to make the message less confusing
    electron.remote.dialog.showMessageBox({
      type: 'info',
      buttons: ['OK'],
      message: "You're in focus mode.",
      detail: 'In focus mode, all tabs except the current one are hidden, and you can\'t create new tabs. You can leave focus mode by unchecking "focus mode" from the view menu.'
    })
  }, 16)
})

ipc.on('exitFocusMode', function () {
  isFocusMode = false
  document.body.classList.remove('is-focus-mode')
})

function showFocusModeError () {
  electron.remote.dialog.showMessageBox({
    type: 'info',
    buttons: ['OK'],
    message: "You're in focus mode.",
    detail: 'You can leave focus mode by unchecking "focus mode" in the view menu.'
  })
}
