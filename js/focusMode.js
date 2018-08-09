var isFocusMode = false

ipc.on('enterFocusMode', function () {
  isFocusMode = true
  document.body.classList.add('is-focus-mode')

  setTimeout(function () { // wait to show the message until the tabs have been hidden, to make the message less confusing
    electron.remote.dialog.showMessageBox({
      type: 'info',
      buttons: [l('closeDialog')],
      message: l('isFocusMode'),
      detail: l('focusModeExplanation1') + ' ' + l('focusModeExplanation2')
    })
  }, 16)
})

ipc.on('exitFocusMode', function () {
  isFocusMode = false
  document.body.classList.remove('is-focus-mode')
})

module.exports = {
  enabled: function () {
    return isFocusMode
  },
  warn: function () {
    electron.remote.dialog.showMessageBox({
      type: 'info',
      buttons: [l('closeDialog')],
      message: l('isFocusMode'),
      detail: l('focusModeExplanation2')
    })
  }
}
