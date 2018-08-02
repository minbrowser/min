/* detects if a page is readerable, and tells the main process if it is */

function pageIsReaderable () {
  var paragraphMap = new Map()

  var paragraphs = document.querySelectorAll('p')
  var totalLength = 0

  if (!paragraphs) {
    return false
  }

  for (var i = 0; i < paragraphs.length; i++) {
    var pLength = Math.max(paragraphs[i].textContent.length - 100, -30)
    totalLength += pLength

    var prev = paragraphMap.get(paragraphs[i].parentNode) || 0
    paragraphMap.set(paragraphs[i].parentNode, prev + pLength)
  }

  var largestValue = 0

  paragraphMap.forEach(function (value, key) {
    if (value > largestValue) {
      largestValue = value
    }
  })

  if ((largestValue > 400 && largestValue / totalLength > 0.33) || (largestValue > 200 && document.querySelector('article, meta[property="og:type"][content="article"]'))) {
    return true
  } else {
    return false
  }
}

window.addEventListener('load', function (e) {
  if (pageIsReaderable()) {
    // the page is probably an article

    // some websites can cause multiple did-finish-load events. In webview.js, we assume these mean a new page, and set readerable to false. Because of this, if we send canReader, and later there is another load event, the button will never show up. To get around this, we send multiple canReader events at intervals.

    setTimeout(function () {
      ipc.send('canReader')
    }, 500)

    setTimeout(function () {
      ipc.send('canReader')
    }, 2500)
  }
})
