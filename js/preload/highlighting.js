textFragmentGenerationUtils.setTimeout(2000)

function addHighlights (highlights) {
  const processedFragmentDirectives = textFragmentUtils.processFragmentDirectives({ text: highlights })
}

ipc.on('createHighlight', function () {
  const highlight = textFragmentGenerationUtils.generateFragment(window.getSelection())
  ipc.send('saveHighlight', highlight)

  console.log(highlight)

  addHighlights([highlight.fragment])
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
