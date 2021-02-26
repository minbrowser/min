var injected = false
function injectStyles () {
  if (injected) {
    return
  }
  injected = true

  var el = document.createElement('style')
  el.textContent = `
    mark {
      background-color: #ffeb00;
      box-shadow: 0 0 0 0.1em #ffeb00;
    }
  `
  document.head.appendChild(el)
}

textFragmentGenerationUtils.setTimeout(3000)

var highlightElementMap = []

function addHighlights (highlights) {
  const processedFragmentDirectives = textFragmentUtils.processFragmentDirectives({ text: highlights })

  processedFragmentDirectives.text.forEach(function (item, i) {
    highlightElementMap.push({
      highlight: highlights[i],
      elements: item
    })
  })

  injectStyles()

  console.log(highlightElementMap)
}

ipc.on('createHighlight', function () {
  const highlight = textFragmentGenerationUtils.generateFragment(window.getSelection())
  ipc.send('saveHighlight', highlight)

  console.log(highlight)

  if (highlight.status === 0) {
    addHighlights([highlight.fragment])
  }
})

ipc.on('setAnnotations', function (e, annotations) {
  setTimeout(function () {
    console.log(arguments)
    const highlights = annotations.filter(a => a.type === 'highlight')
    console.log(highlights)
    const processedFragmentDirectives = addHighlights(highlights.map(h => h.item))
    console.log(processedFragmentDirectives)
  }, 2000)
})
