/* check if Min is available for the user's computer */

var failMessage = 'Min requires macOS or Linux'

var platforms = {
  'MacIntel': 'https://github.com/minbrowser/min/releases/download/v1.7.0/Min-v1.7.0-darwin-x64.zip',
  'Linux i686': 'https://github.com/minbrowser/min/releases/download/v1.7.0/Min_1.7.0_i386.deb',
  'x86_64': 'https://github.com/minbrowser/min/releases/download/v1.7.0/Min_1.7.0_amd64.deb'
}

function getDownloadLink() {
  var downloadLink = null

  for (var platform in platforms) {
    if (navigator.platform.indexOf(platform) !== -1) {
      downloadLink = platforms[platform]
      break
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

var downloadLink = getDownloadLink();

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

if (downloadLink && navigator.platform !== 'MacIntel') {
  for (var i = 0; i < subtextArray.length; i++) {
    subtextArray[i].parentNode.removeChild(subtextArray[i])
  }
}

var backdrop = document.getElementsByClassName('backdrop')[0]
var dialog = document.getElementsByClassName('dialog')[0]

var dialogCloseButtons = document.getElementsByClassName('dialog-close-button')

function openDownloadPopup() {
  backdrop.hidden = false
  dialog.hidden = false
}

function closeDownloadPopup() {
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
