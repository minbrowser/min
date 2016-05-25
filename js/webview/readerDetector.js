/* detects if a page is readerable, and tells the main process if it is */

function getReaderScore () {
  var paragraphs = document.querySelectorAll('p')
  var tl = 0
  if (!paragraphs) {
    return
  }
  for (var i = 0; i < paragraphs.length; i++) {
    tl += Math.max(paragraphs[i].textContent.length - 100, -30)
  }
  return tl
}

window.addEventListener('load', function (e) {
  var tl = getReaderScore()

  // for debugging
  // window._browser_readerScore = tl

  if (tl > 650 || (document.querySelector('article') && tl > 200)) {
    // the page is probably an article

    // some websites can cause multiple did-finish-load events. In webview.js, we assume these mean a new page, and set readerable to false. Because of this, if we send canReader, and later there is another load event, the button will never show up. To get around this, we send multiple canReader events at intervals.

    setTimeout(function () {
      ipc.sendToHost('canReader')
    }, 500)

    setTimeout(function () {
      ipc.sendToHost('canReader')
    }, 2500)
  }
})
