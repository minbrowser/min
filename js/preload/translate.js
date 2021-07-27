const maxNodesToTranslate = 240
const chunkSize = 15

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

async function translate (lang) {
  var nodes = getNodes(document, window)

  // try to also extract text for same-origin iframes (such as the reader mode frame)

  var frames = document.querySelectorAll('iframe')

  for (var x = 0; x < frames.length; x++) {
    try {
      nodes = nodes.concat(getNodes(frames[x].contentDocument, frames[x].contentWindow))
    } catch (e) { }
  }

  nodes = nodes.filter(n => n.textContent.replace(/\s+/g, '').length > 2)

  function handleChunk (start, end) {
    console.log(start, end)
    var query = nodes.slice(start, end).map(node => node.textContent)

    ipc.send('translation-request', {
      query,
      range: [start, end],
      lang
    })

    ipc.once('translation-response', function (e, data) {
      data.response.translatedText.forEach(function (text, i) {
        var idx = data.range[0] + i

        if (query[i].startsWith(' ')) {
          text = ' ' + text
        }
        if (query[i].endsWith(' ')) {
          text += ' '
        }

        nodes[idx].textContent = text
      })

      if (data.range[1] < maxNodesToTranslate && data.range[1] < nodes.length) {
        handleChunk(data.range[1], data.range[1] + chunkSize)
      }
    })
  }

  handleChunk(0, chunkSize)
}

ipc.on('translate-page', function (e, lang) {
  translate(lang)
})
