var settings = require('util/settings/settings.js')

const windowControls = {
  controlsColor: null,
  initialize: function () {
    if (settings.get('useSeparateTitlebar') === true) {
      document.body.classList.add('separate-titlebar')
    }

    window.addEventListener('theme-colors-changed', function (e) {
      windowControls.controlsColor = e.detail.foreground
      ipc.send('set-controls-color', windowControls.controlsColor)
    })

    window.addEventListener('task-overlay-shown', function (e) {
      ipc.send('set-controls-color', document.body.classList.contains('dark-mode') ? 'white' : 'black')
    })

    window.addEventListener('task-overlay-hidden', function (e) {
      ipc.send('set-controls-color', windowControls.controlsColor)
    })
  }
}

module.exports = windowControls
