var settings = require('util/settings/settings.js')

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
    remote.getCurrentWindow().minimize()
  })

  captionMaximize.addEventListener('click', function (e) {
    remote.getCurrentWindow().maximize()
  })

  captionRestore.addEventListener('click', function (e) {
    if (windowIsFullscreen) {
      remote.getCurrentWindow().setFullScreen(false)
    } else {
      remote.getCurrentWindow().unmaximize()
    }
  })

  captionClose.addEventListener('click', function (e) {
    remote.getCurrentWindow().close()
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
    remote.getCurrentWindow().close()
  })
  linuxMaximize.addEventListener('click', function (e) {
    if (windowIsFullscreen) {
      remote.getCurrentWindow().setFullScreen(false)
    } else if (windowIsMaximized) {
      remote.getCurrentWindow().unmaximize()
    } else {
      remote.getCurrentWindow().maximize()
    }
  })
  linuxMinimize.addEventListener('click', function (e) {
    remote.getCurrentWindow().minimize()
  })
}
