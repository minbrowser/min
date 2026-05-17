const path = require('path')
const statistics = require('js/statistics.js')
const settings = require('util/settings/settings.js')
const webviews = require('webviews.js')

const newTabPage = {
  background: document.getElementById('ntp-background'),
  hasBackground: false,
  picker: document.getElementById('ntp-image-picker'),
  deleteBackground: document.getElementById('ntp-image-remove'),
  imagePath: path.join(window.globalArgs['user-data-path'], 'newTabBackground'),
  blobInstance: null,
  reloadBackground: function () {
    const newTabUrl = settings.get('newTabUrl')
    if (newTabUrl === 'blank') {
      newTabPage.background.hidden = true
      newTabPage.hasBackground = false
      document.body.classList.remove('ntp-has-background')
      newTabPage.deleteBackground.hidden = true
      return
    }

    fs.readFile(newTabPage.imagePath, function (err, data) {
      if (newTabPage.blobInstance) {
        URL.revokeObjectURL(newTabPage.blobInstance)
        newTabPage.blobInstance = null
      }
      if (err) {
        newTabPage.background.hidden = true
        newTabPage.hasBackground = false
        document.body.classList.remove('ntp-has-background')
        newTabPage.deleteBackground.hidden = true
      } else {
        const blob = new Blob([data], { type: 'application/octet-binary' })
        const url = URL.createObjectURL(blob)
        newTabPage.blobInstance = url
        newTabPage.background.src = url

        newTabPage.background.hidden = false
        newTabPage.hasBackground = true
        document.body.classList.add('ntp-has-background')
        newTabPage.deleteBackground.hidden = false
      }
    })
  },
  pickImage: async function () {
    var filePath = await ipc.invoke('showOpenDialog', {
      filters: [
        { name: 'Image files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    })

    if (!filePath || filePath.length === 0) {
      // User cancelled the file picker - reset to blank if no image was previously set
      if (!newTabPage.hasBackground) {
        settings.set('newTabUrl', 'blank')
      }
      return
    }

    await fs.promises.copyFile(filePath[0], newTabPage.imagePath)
    settings.set('newTabUrl', 'backgroundImage')
    newTabPage.reloadBackground()
  },
  removeImage: async function () {
    await fs.promises.unlink(newTabPage.imagePath)
    settings.set('newTabUrl', 'blank')
    newTabPage.reloadBackground()
  },
  initialize: function () {
    newTabPage.reloadBackground()

    newTabPage.picker.addEventListener('click', newTabPage.pickImage)

    newTabPage.deleteBackground.addEventListener('click', newTabPage.removeImage)

    webviews.bindIPC('uploadNewTabBackground', function () {
      newTabPage.pickImage()
    })

    webviews.bindIPC('removeNewTabBackground', function () {
      newTabPage.removeImage()
    })

    statistics.registerGetter('ntpHasBackground', function () {
      return newTabPage.hasBackground
    })

    settings.listen('newTabUrl', function (value) {
      newTabPage.reloadBackground()
    })
  }
}

module.exports = newTabPage
