const path = require('path')

const newTabPage = {
  background: document.getElementById('ntp-background'),
  picker: document.getElementById('ntp-image-picker'),
  imagePath: path.join(window.globalArgs['user-data-path'], 'newTabBackground'),
  initialize: function () {
    newTabPage.background.src = newTabPage.imagePath
    newTabPage.background.hidden = false

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

      newTabPage.background.src = newTabPage.imagePath + '?t=' + Date.now()
    })
  }
}

module.exports = newTabPage
