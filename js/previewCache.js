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
  // discard any images for tabs that don't exist any more
  // TODO replace this with an event listener
  for (var tab in previewCache.images) {
    if (!tasks.getTaskContainingTab(tab)) {
      delete previewCache.images[tab]
    }
  }

  localStorage.setItem('previewCache', JSON.stringify(previewCache.images))
}, 60000)

module.exports = previewCache
