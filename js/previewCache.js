/* saves preview images for each tab */

var previewCache = {
  images: {}, // tabId: image
  get: function (tabId) {
    return previewCache.images[tabId]
  },
  set: function (tabId, image) {
    previewCache.images[tabId] = image
  }
}

var savedData = localStorage.getItem('previewCache')

if (savedData) {
  try {
    previewCache.images = JSON.parse(savedData)
  } catch (e) {
    console.warn('discarding preview cache', e)
    previewCache.images = {}
  }
}

setInterval(function () {
  // discard any images for tabs that don't exist any more or that haven't been active recently
  for (var tab in previewCache.images) {
    let containingTask = tasks.getTaskContainingTab(tab)
    if (!containingTask || Date.now() - containingTask.tabs.get(tab).lastActivity > (3 * 24 * 60 * 60 * 1000)) {
      delete previewCache.images[tab]
    }
  }

  localStorage.setItem('previewCache', JSON.stringify(previewCache.images))
}, 60000)

module.exports = previewCache
