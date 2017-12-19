var captionMinimise =
  document.querySelector('.windows-caption-buttons .caption-minimise, body.linux .titlebar-linux .caption-minimise')

var captionMaximise =
  document.querySelector('.windows-caption-buttons .caption-maximise, body.linux .titlebar-linux .caption-maximise')

var captionRestore =
  document.querySelector('.windows-caption-buttons .caption-restore, body.linux .titlebar-linux .caption-restore')

var captionClose =
  document.querySelector('.windows-caption-buttons .caption-close, body.linux .titlebar-linux .caption-close')

var windowIsMaximised = false
var windowIsFullscreen = false

if (navigator.platform === 'Win32') {
  captionMinimise.addEventListener('click', function (e) {
    remote.getCurrentWindow().minimize()
  })

  captionMaximise.addEventListener('click', function (e) {
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

  if (windowIsMaximised || windowIsFullscreen) {
    captionMaximise.hidden = true
    captionRestore.hidden = false
  } else {
    captionMaximise.hidden = false
    captionRestore.hidden = true
  }

  ipc.on('maximize', function (e) {
    windowIsMaximised = true
    captionMaximise.hidden = true
    captionRestore.hidden = false
  })
  ipc.on('unmaximize', function (e) {
    windowIsMaximised = false
    captionMaximise.hidden = false
    captionRestore.hidden = true
  })
  ipc.on('enter-full-screen', function (e) {
    windowIsFullscreen = true
    captionMaximise.hidden = true
    captionRestore.hidden = false
  })
  ipc.on('leave-full-screen', function (e) {
    windowIsFullscreen = false
    if (windowIsMaximised) {
      captionMaximise.hidden = true
      captionRestore.hidden = false
    } else {
      captionMaximise.hidden = false
      captionRestore.hidden = true
    }
  })
}
