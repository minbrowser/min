const maxCharsToTranslate = 15000

function isVisible (el) {
  // https://github.com/jquery/jquery/blob/305f193aa57014dc7d8fa0739a3fefd47166cd44/src/css/hiddenVisibleSelectors.js
  return el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)
}

function getNodes (doc, win) {
  var maybeNodes = [].slice.call(doc.body.childNodes)
  var textNodes = []

  var ignore = 'link, style, script, noscript, .hidden, [class*="-hidden"], .visually-hidden, .visuallyhidden, [role=presentation], [hidden], [style*="display:none"], [style*="display: none"], .ad, .dialog, .modal, select, svg, details:not([open])'

  ignore += ', pre, code'

  while (maybeNodes.length) {
    var node = maybeNodes.shift()

    // if the node should be ignored, skip it and all of it's child nodes
    if (node.matches && node.matches(ignore)) {
      continue
    }

    // if the node is a text node, add it to the list of text nodes

    if (node.nodeType === 3) {
      textNodes.push(node)
      continue
    }

    if (!isVisible(node)) {
      continue
    }

    // otherwise, add the node's text nodes to the list of text, and the other child nodes to the list of nodes to check
    var childNodes = node.childNodes
    var cnl = childNodes.length

    for (var i = cnl - 1; i >= 0; i--) {
      var childNode = childNodes[i]
      maybeNodes.unshift(childNode)
    }
  }

  return textNodes
}

async function translate (destLang) {
  var nodes = getNodes(document, window)

  var titleElement = document.querySelector('title')
  if (titleElement && titleElement.childNodes && titleElement.childNodes[0]) {
    nodes.unshift(titleElement.childNodes[0])
  }

  // try to also extract text for same-origin iframes (such as the reader mode frame)

  var frames = document.querySelectorAll('iframe')

  for (var x = 0; x < frames.length; x++) {
    try {
      nodes = nodes.concat(getNodes(frames[x].contentDocument, frames[x].contentWindow))
    } catch (e) { }
  }

  var nodesSet = nodes.filter(n => n.textContent.replace(/[\s0-9]+/g, '').length > 2).map(n => ({ node: n, translated: false, originalLength: n.textContent.length }))

  function handleChunk () {
    // rescore the nodes

    var selectionParent
    try {
      selectionParent = window.getSelection().getRangeAt(0).commonAncestorContainer
    } catch (e) {
    }

    var sortedNodes = nodesSet.map(item => {
      item.score = 0
      if (selectionParent && selectionParent.contains(item.node)) {
        item.score += 2
      }
      try {
        var rect = item.node.parentNode.getBoundingClientRect()
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          item.score += 1
        }
      } catch (e) {}
      return item
    }).sort((a, b) => b.score - a.score)

    // select up to 1k chars from the untranslated set

    var nodesInQuery = []
    var charsSelected = 0
    sortedNodes.forEach(function (item) {
      if (charsSelected < 500 && !item.translated) {
        nodesInQuery.push(item.node)
        charsSelected += item.node.textContent.length
      }
    })

    var query = nodesInQuery.map(node => node.textContent)
    var requestId = Math.random()

    ipc.send('translation-request', {
      query,
      lang: destLang,
      requestId
    })

    ipc.once('translation-response-' + requestId, function (e, data) {
      data.response.translatedText.forEach(function (text, i) {
        var rootNodeIndex = nodesSet.findIndex(item => item.node === nodesInQuery[i])

        if (query[i].startsWith(' ')) {
          text = ' ' + text
        }
        if (query[i].endsWith(' ')) {
          text += ' '
        }

        /*
        When the Libretranslate model encounters unknown vocabulary (or the language auto-detect is wrong),
        it sometimes produces very long, nonsensical output. Try to detect that and skip the translation.
        */
        if (query[i].length > 2 && (text.length / query[i].length > 20)) {
          console.warn('skipping possibly invalid translation: ', query[i], ' -> ', text)
          return
        }

        /*
        The English model frequently produces translations in lowercase.
        As a workaround, capitalize the first character if the original was uppercase
        */
        if (destLang === 'en') {
          var originalFirstChar = query[i][0]
          if (originalFirstChar && originalFirstChar.toUpperCase() === originalFirstChar) {
            text = text[0].toUpperCase() + text.substring(1)
          }
        }

        nodesSet[rootNodeIndex].node.textContent = text
        nodesSet[rootNodeIndex].translated = true
      })

      console.log('translated ', nodesSet.filter(item => item.translated).map(item => item.originalLength).reduce((a, b) => a + b), 'chars')
      if (nodesSet.filter(item => item.translated).map(item => item.originalLength).reduce((a, b) => a + b) < maxCharsToTranslate && nodesSet.some(item => !item.translated)) {
        handleChunk()
      }
    })
  }

  handleChunk()
}

ipc.on('translate-page', function (e, lang) {
  translate(lang)
})
