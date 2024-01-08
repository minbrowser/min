const path = require('path')
const statistics = require('js/statistics.js')

const newTabPage = {
  background: document.getElementById('ntp-background'),
  hasBackground: false,
  picker: document.getElementById('ntp-image-picker'),
  deleteBackground: document.getElementById('ntp-image-remove'),
  imagePath: path.join(window.globalArgs['user-data-path'], 'newTabBackground'),
  blobInstance: null,
  reloadBackground: function () {
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
  initialize: function () {
    newTabPage.reloadBackground()

    newTabPage.picker.addEventListener('click', async function () {
      var filePath = await ipc.invoke('showOpenDialog', {
        filters: [
          { name: 'Image files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
      })

      if (!filePath) {
        return
      }

      await fs.promises.copyFile(filePath[0], newTabPage.imagePath)
      newTabPage.reloadBackground()
    })

    newTabPage.deleteBackground.addEventListener('click', async function () {
      await fs.promises.unlink(newTabPage.imagePath)
      newTabPage.reloadBackground()
    })

    statistics.registerGetter('ntpHasBackground', function () {
      return newTabPage.hasBackground
    })
  }
}

module.exports = newTabPage
