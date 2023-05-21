var isFocusMode = false

ipc.on('enterFocusMode', function () {
  isFocusMode = true
  document.body.classList.add('is-focus-mode')
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
    ipc.invoke('showFocusModeDialog2')
  }
}
