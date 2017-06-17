var titlebarWindowsMinimise = document.getElementById('titlebar-windows-minimise')
var titlebarWindowsMaximise = document.getElementById('titlebar-windows-maximise')
var titlebarWindowsRestore = document.getElementById('titlebar-windows-restore')
var titlebarWindowsClose = document.getElementById('titlebar-windows-close')

titlebarWindowsMinimise.addEventListener('click', function (e) {
  remote.getCurrentWindow().minimize()
})

titlebarWindowsMaximise.addEventListener('click', function (e) {
  remote.getCurrentWindow().maximize()
})

titlebarWindowsRestore.addEventListener('click', function (e) {
  if (browserWindow.isFullScreen()) {
    remote.getCurrentWindow().setFullScreen(false)
  } else {
    remote.getCurrentWindow().restore()
  }
})

titlebarWindowsClose.addEventListener('click', function (e) {
  remote.getCurrentWindow().close()
})

{
  var browserWindow = remote.getCurrentWindow()
  switch(process.platform){
    case 'win32':
      if (browserWindow.isMaximized()||browserWindow.isFullScreen()) {
        titlebarWindowsMaximise.hidden = true
        titlebarWindowsRestore.hidden = false
      } else {
        titlebarWindowsMaximise.hidden = false
        titlebarWindowsRestore.hidden = true
      }

      browserWindow.on('maximize', function (e) {
        titlebarWindowsMaximise.hidden = true
        titlebarWindowsRestore.hidden = false
      })
      browserWindow.on('unmaximize', function (e) {
        titlebarWindowsMaximise.hidden = false
        titlebarWindowsRestore.hidden = true
      })
      browserWindow.on('enter-full-screen', function (e) {
        titlebarWindowsMaximise.hidden = true
        titlebarWindowsRestore.hidden = false
      })
      browserWindow.on('leave-full-screen', function (e) {
        if (browserWindow.isMaximized()) {
          titlebarWindowsMaximise.hidden = true
          titlebarWindowsRestore.hidden = false
        } else {
          titlebarWindowsMaximise.hidden = false
          titlebarWindowsRestore.hidden = true
        }
      })
      break;
  }
}
