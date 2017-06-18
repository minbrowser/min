var captionMinimise =
  document.querySelector('body.windows .titlebar-windows .caption-minimise, body.linux .titlebar-linux .caption-minimise')

var captionMaximise =
  document.querySelector('body.windows .titlebar-windows .caption-maximise, body.linux .titlebar-linux .caption-maximise')

var captionRestore =
  document.querySelector('body.windows .titlebar-windows .caption-restore, body.linux .titlebar-linux .caption-restore')

var captionClose =
  document.querySelector('body.windows .titlebar-windows .caption-close, body.linux .titlebar-linux .caption-close')

{
  var browserWindow = remote.getCurrentWindow()
  switch(process.platform){
    case 'win32':
    case 'linux':
      captionMinimise.addEventListener('click', function (e) {
        remote.getCurrentWindow().minimize()
      })

      captionMaximise.addEventListener('click', function (e) {
        remote.getCurrentWindow().maximize()
      })

      captionRestore.addEventListener('click', function (e) {
        if (browserWindow.isFullScreen()) {
          remote.getCurrentWindow().setFullScreen(false)
        } else {
          remote.getCurrentWindow().restore()
        }
      })

      captionClose.addEventListener('click', function (e) {
        remote.getCurrentWindow().close()
      })

      if (browserWindow.isMaximized()||browserWindow.isFullScreen()) {
        captionMaximise.hidden = true
        captionRestore.hidden = false
      } else {
        captionMaximise.hidden = false
        captionRestore.hidden = true
      }

      browserWindow.on('maximize', function (e) {
        captionMaximise.hidden = true
        captionRestore.hidden = false
      })
      browserWindow.on('unmaximize', function (e) {
        captionMaximise.hidden = false
        captionRestore.hidden = true
      })
      browserWindow.on('enter-full-screen', function (e) {
        captionMaximise.hidden = true
        captionRestore.hidden = false
      })
      browserWindow.on('leave-full-screen', function (e) {
        if (browserWindow.isMaximized()) {
          captionMaximise.hidden = true
          captionRestore.hidden = false
        } else {
          captionMaximise.hidden = false
          captionRestore.hidden = true
        }
      })
      break;
  }
}
