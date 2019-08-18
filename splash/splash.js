/* check if Min is available for the user's computer */

var failMessage = "Min isn't supported on your OS"

// matches against navigator.platform
var platformMatchStrings = {
  'MacIntel': 'https://github.com/minbrowser/min/releases/download/v1.11.0/Min-v1.11.0-darwin-x64.zip',
  // electron no longer supports 32-bit linux (https://electronjs.org/blog/linux-32bit-support), so there's only a 64-bit build available
  // As of 1.9, around 15% of Linux downloads are 32-bit, so hopefully we're just detecting support incorrectly and the 64-bit build will work
  'Linux i686': 'https://github.com/minbrowser/min/releases/download/v1.11.0/min_1.11.0_amd64.deb',
  'x86_64': 'https://github.com/minbrowser/min/releases/download/v1.11.0/min_1.11.0_amd64.deb'
}

// matches against navigator.userAgent
var UAMatchStrings = {
  'Win64': 'https://github.com/minbrowser/min/releases/download/v1.11.0/min-1.11.0-setup.exe',
  'WOW64': 'https://github.com/minbrowser/min/releases/download/v1.11.0/min-1.11.0-setup.exe',
  // neither of the 64-bit strings matched, fall back to 32-bit
  'Windows NT': 'https://github.com/minbrowser/min/releases/download/v1.11.0/Min-v1.11.0-win32-ia32.zip'
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

var downloadButtons = document.getElementsByClassName('download-button')
var subtexts = document.getElementsByClassName('button-subtext')

// convert from a collection to an array, so the list doesn't change as we remove elements
var subtextArray = []

for (var i = 0; i < subtexts.length; i++) {
  subtextArray.push(subtexts[i])
}

var downloadLink = getDownloadLink()

if (downloadLink) {
  for (var i = 0; i < downloadButtons.length; i++) {
    downloadButtons[i].parentElement.href = downloadLink

    // show gatekeeper instruction popup
    if (navigator.platform === 'MacIntel') {
      downloadButtons[i].addEventListener('click', function () {
        setTimeout(openDownloadPopup, 500)
      }, false)
    }
  }
} else {
  for (var i = 0; i < downloadButtons.length; i++) {
    downloadButtons[i].classList.add('disabled')
    downloadButtons[i].getElementsByClassName('button-label')[0].textContent = failMessage
  }
  for (var i = 0; i < subtexts.length; i++) {
    subtexts[i].textContent = 'Download anyway >>'
  }
}

var backdrop = document.getElementsByClassName('backdrop')[0]
var dialog = document.getElementsByClassName('dialog')[0]

var dialogCloseButtons = document.getElementsByClassName('dialog-close-button')

function openDownloadPopup () {
  backdrop.hidden = false
  dialog.hidden = false
}

function closeDownloadPopup () {
  backdrop.hidden = true
  dialog.hidden = true
}

for (var i = 0; i < dialogCloseButtons.length; i++) {
  dialogCloseButtons[i].addEventListener('click', function (e) {
    closeDownloadPopup()
  }, false)
}

backdrop.addEventListener('click', function () {
  closeDownloadPopup()
}, false)
