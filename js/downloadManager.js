function getFileSizeString (bytes) {
  let prefixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  let size = bytes
  let prefixIndex = 0

  while (size > 900) { // prefer "0.9 KB" to "949 bytes"
    size /= 1000
    prefixIndex++
  }

  return (Math.round(size * 10) / 10) + ' ' + prefixes[prefixIndex]
}

const downloadManager = {
  isShown: false,
  bar: document.getElementById('download-bar'),
  container: document.getElementById('download-container'),
  closeButton: document.getElementById('download-close-button'),
  height: 39,
  downloadItems: {},
  downloadBarElements: {},
  show: function () {
    if (!downloadManager.isShown) {
      downloadManager.isShown = true
      downloadManager.bar.hidden = false
      webviews.adjustMargin([0, 0, downloadManager.height, 0])
    }
  },
  hide: function () {
    if (downloadManager.isShown) {
      downloadManager.isShown = false
      downloadManager.bar.hidden = true
      webviews.adjustMargin([0, 0, downloadManager.height * -1, 0])

      // remove all completed items
      for (let item in downloadManager.downloadItems) {
        if (downloadManager.downloadItems[item].status === 'completed') {
          downloadManager.removeItem(item)
        }
      }
    }
  },
  removeItem: function (path) {
    downloadManager.downloadBarElements[path].container.remove()

    delete downloadManager.downloadBarElements[path]
    delete downloadManager.downloadItems[path]

    if (Object.keys(downloadManager.downloadItems).length === 0) {
      downloadManager.hide()
    }
  },
  onItemClicked: function (path) {
    if (downloadManager.downloadItems[path].status === 'completed') {
      electron.shell.openItem(path)
      // provide a bit of time for the file to open before the download bar disappears
      setTimeout(function () {
        downloadManager.removeItem(path)
      }, 100)
    }
  },
  createItem: function (downloadItem) {
    let container = document.createElement('div')
    container.className = 'download-item'
    container.setAttribute('role', 'listitem')

    let title = document.createElement('div')
    title.className = 'download-title'
    title.textContent = downloadItem.name
    container.appendChild(title)

    let infoBox = document.createElement('div')
    infoBox.className = 'download-info'
    infoBox.textContent = getFileSizeString(downloadItem.size.total)
    container.appendChild(infoBox)

    let progress = document.createElement('div')
    progress.className = 'download-progress'
    container.appendChild(progress)

    let dropdown = document.createElement('i')
    dropdown.className = 'download-cancel-button fa fa-angle-down'
    container.appendChild(dropdown)

    container.addEventListener('click', function () {
      downloadManager.onItemClicked(downloadItem.path)
    })

    downloadManager.container.appendChild(container)
    downloadManager.downloadBarElements[downloadItem.path] = {
    container, title, infoBox, progress, dropdown}
  },
  updateItem: function (downloadItem) {
    let elements = downloadManager.downloadBarElements[downloadItem.path]

    if (downloadItem.status === 'completed') {
      elements.container.classList.remove('loading')
      elements.progress.hidden = true
      elements.dropdown.hidden = true
      elements.infoBox.textContent = 'Completed' // TODO localize string
    } else if (downloadItem.status === 'failed') {
      elements.container.classList.remove('loading')
      elements.progress.hidden = true
      elements.dropdown.hidden = true
      elements.infoBox.textContent = 'Failed' // TODO localize string
    } else {
      elements.container.classList.add('loading')
      elements.progress.style.transform = 'scaleX(' + (downloadItem.size.received / downloadItem.size.total) + ')'
    }
  },
  initialize: function () {
    this.closeButton.addEventListener('click', function () {
      downloadManager.hide()
    })

    ipc.on('download-info', function (e, info) {
      if (!info.path) {
        // download save location hasn't been chosen yet
        return
      }

      if (!downloadManager.downloadItems[info.path]) {
        downloadManager.show()
        downloadManager.createItem(info)
      }
      downloadManager.updateItem(info)

      downloadManager.downloadItems[info.path] = info
    })
  }
}

module.exports = downloadManager
