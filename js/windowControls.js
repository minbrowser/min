var settings = require('util/settings/settings.js')

function initialize () {
  if (settings.get('useSeparateTitlebar') === true) {
    document.body.classList.add('separate-titlebar')
  }

  var windowIsMaximized = false
  var windowIsFullscreen = false

  var captionMinimize =
  document.querySelector('.windows-caption-buttons .caption-minimise, body.linux .titlebar-linux .caption-minimise')

  var captionMaximize =
  document.querySelector('.windows-caption-buttons .caption-maximize, body.linux .titlebar-linux .caption-maximize')

  var captionRestore =
  document.querySelector('.windows-caption-buttons .caption-restore, body.linux .titlebar-linux .caption-restore')

  var captionClose =
  document.querySelector('.windows-caption-buttons .caption-close, body.linux .titlebar-linux .caption-close')

  var linuxClose = document.querySelector('#linux-control-buttons #close-button')
  var linuxMinimize = document.querySelector('#linux-control-buttons #minimize-button')
  var linuxMaximize = document.querySelector('#linux-control-buttons #maximize-button')

  function updateCaptionButtons () {
    if (window.platformType === 'windows') {
      if (windowIsMaximized || windowIsFullscreen) {
        captionMaximize.hidden = true
        captionRestore.hidden = false
      } else {
        captionMaximize.hidden = false
        captionRestore.hidden = true
      }
    }
  }

  if (window.platformType === 'windows') {
    updateCaptionButtons()

    captionMinimize.addEventListener('click', function (e) {
      ipc.invoke('minimize')
    })

    captionMaximize.addEventListener('click', function (e) {
      ipc.invoke('maximize')
    })

    captionRestore.addEventListener('click', function (e) {
      if (windowIsFullscreen) {
        ipc.invoke('setFullScreen', false)
      } else {
        ipc.invoke('unmaximize')
      }
    })

    captionClose.addEventListener('click', function (e) {
      ipc.invoke('close')
    })
  }

  ipc.on('maximize', function (e) {
    windowIsMaximized = true
    updateCaptionButtons()
  })
  ipc.on('unmaximize', function (e) {
    windowIsMaximized = false
    updateCaptionButtons()
  })
  ipc.on('enter-full-screen', function (e) {
    windowIsFullscreen = true
    updateCaptionButtons()
  })
  ipc.on('leave-full-screen', function (e) {
    windowIsFullscreen = false
    updateCaptionButtons()
  })

  if (window.platformType === 'linux') {
    linuxClose.addEventListener('click', function (e) {
      ipc.invoke('close')
    })
    linuxMaximize.addEventListener('click', function (e) {
      if (windowIsFullscreen) {
        ipc.invoke('setFullScreen', false)
      } else if (windowIsMaximized) {
        ipc.invoke('unmaximize')
      } else {
        ipc.invoke('maximize')
      }
    })
    linuxMinimize.addEventListener('click', function (e) {
      ipc.invoke('minimize')
    })
  }
}

module.exports = { initialize }
