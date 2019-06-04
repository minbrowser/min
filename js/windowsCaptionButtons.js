var captionMinimise =
document.querySelector('.windows-caption-buttons .caption-minimise, body.linux .titlebar-linux .caption-minimise')

var captionMaximize =
document.querySelector('.windows-caption-buttons .caption-maximize, body.linux .titlebar-linux .caption-maximize')

var captionRestore =
document.querySelector('.windows-caption-buttons .caption-restore, body.linux .titlebar-linux .caption-restore')

var captionClose =
document.querySelector('.windows-caption-buttons .caption-close, body.linux .titlebar-linux .caption-close')

var windowIsMaximized = false
var windowIsFullscreen = false

function updateCaptionButtons () {
  if (windowIsMaximized || windowIsFullscreen) {
    captionMaximize.hidden = true
    captionRestore.hidden = false
  } else {
    captionMaximize.hidden = false
    captionRestore.hidden = true
  }
}

if (navigator.platform === 'Win32') {
  updateCaptionButtons()

  captionMinimise.addEventListener('click', function (e) {
    remote.getCurrentWindow().minimize()
  })

  captionMaximize.addEventListener('click', function (e) {
    remote.getCurrentWindow().maximize()
  })

  captionRestore.addEventListener('click', function (e) {
    if (windowIsFullscreen) {
      remote.getCurrentWindow().setFullScreen(false)
    } else {
      remote.getCurrentWindow().restore()
    }
  })

  captionClose.addEventListener('click', function (e) {
    remote.getCurrentWindow().close()
  })

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
}
