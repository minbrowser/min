function showMacDialog () {
  var backdrop = document.createElement('div')
  backdrop.className = 'backdrop'
  document.body.appendChild(backdrop)

  var dialog = document.createElement('div')
  dialog.className = 'dialog centered'
  dialog.innerHTML = '<h1>How to install Min</h1>\
  <ul>\
    <li>Drag Min from your Downloads folder to the Applications folder.</li>\
    <li>Right click on Min.</li>\
    <li>Choose "Open".</li>\
    <li>If a warning dialog is shown, choose "Open".</li>\
  </ul>'

  var dialogButton = document.createElement('button')
  dialogButton.className = 'button outlined-button outlined-button-white'
  dialogButton.setAttribute('style', 'display: block; margin: auto')
  dialogButton.textContent = 'Done'
  dialog.appendChild(dialogButton)
  dialogButton.addEventListener('click', function () {
    backdrop.parentNode.removeChild(backdrop)
    dialog.parentNode.removeChild(dialog)
  })

  document.body.appendChild(dialog)
}

/* check if Min is available for the user's computer */

var failMessage = "Min isn't supported on your OS"

// matches against navigator.platform
var platformMatchStrings = {
  'MacIntel': 'https://github.com/minbrowser/min/releases/download/v1.13.2/Min-v1.13.2-darwin-x64.zip',
  // electron no longer supports 32-bit linux (https://electronjs.org/blog/linux-32bit-support), so there's only a 64-bit build available
  // As of 1.9, around 15% of Linux downloads are 32-bit, so hopefully we're just detecting support incorrectly and the 64-bit build will work
  'Linux i686': 'https://github.com/minbrowser/min/releases/download/v1.13.2/min_1.13.2_amd64.deb',
  'x86_64': 'https://github.com/minbrowser/min/releases/download/v1.13.2/min_1.13.2_amd64.deb',
  'Linux aarch64': 'https://github.com/minbrowser/min/releases/download/v1.13.2/min_1.13.2_armhf.deb'
}

// matches against navigator.userAgent
var UAMatchStrings = {
  'Win64': 'https://github.com/minbrowser/min/releases/download/v1.13.2/min-1.13.2-setup.exe',
  'WOW64': 'https://github.com/minbrowser/min/releases/download/v1.13.2/min-1.13.2-setup.exe',
  // neither of the 64-bit strings matched, fall back to 32-bit
  'Windows NT': 'https://github.com/minbrowser/min/releases/download/v1.13.2/Min-v1.13.2-win32-ia32.zip'
}

function getDownloadLink () {
  var downloadLink = null

  for (var platform in platformMatchStrings) {
    if (navigator.platform.indexOf(platform) !== -1) {
      downloadLink = platformMatchStrings[platform]
      break
    }
  }

  if (!downloadLink) {
    for (var ua in UAMatchStrings) {
      if (navigator.userAgent.indexOf(ua) !== -1) {
        downloadLink = UAMatchStrings[ua]
        break
      }
    }
  }

  // android often reports linux as the platform, but we don't have an android download

  if (navigator.userAgent.indexOf('Android') !== -1) {
    downloadLink = null
  }

  return downloadLink
}

function setupDownloadButton (button) {
  var downloadLink = getDownloadLink()

  if (downloadLink) {
    button.parentElement.href = downloadLink

    // show gatekeeper instruction popup
    if (navigator.platform === 'MacIntel') {
      button.addEventListener('click', function () {
        setTimeout(showMacDialog, 500)
      }, false)
    }
  } else {
    button.parentElement.href = 'https://github.com/minbrowser/min/releases/latest'
    button.classList.add('disabled')
    button.getElementsByClassName('button-label')[0].textContent = failMessage

    var subtext = document.createElement('span')
    subtext.className = 'button-subtext'
    subtext.textContent = 'Download anyway >>'
    button.appendChild(subtext)
  }
}

var downloadButtons = document.getElementsByClassName('download-button')

for (var i = 0; i < downloadButtons.length; i++) {
  setupDownloadButton(downloadButtons[i])
}
