/*
  this plugin will provide the ability to perform simple calculations
*/

const { clipboard } = require('electron')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const Parser = require('expr-eval').Parser

const math = new Parser()

function doMath (text, input, event) {
  searchbarPlugins.reset('calculatorPlugin')
  var result

  try {
    result = math.evaluate(text)
  } catch (e) { return }

  searchbarPlugins.addResult('calculatorPlugin', {
    icon: 'carbon:calculator',
    title: `${result.toString()}`
  })

  const container = searchbarPlugins.getContainer('calculatorPlugin')

  if (container.childNodes.length === 1) {
    const item = container.childNodes[0]
    item.setAttribute('title', l('clickToCopy'))
    item.addEventListener('click', (e) => {
      clipboard.writeText(e.target.innerText)
    })
  }
}

function initialize () {
  searchbarPlugins.register('calculatorPlugin', {
    index: 1,
    trigger: function (text) {
      if (text.length < 3 || /^[\d\s.]+$/.test(text)) {
        return false
      }

      try { math.parse(text) } catch (e) { return false }
      return true
    },
    showResults: debounce(doMath, 200)
  })
}

module.exports = { initialize }
