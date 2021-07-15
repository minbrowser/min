const { clipboard } = require('electron')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const math = require('mathjs')

function doMath (text, input, event) {
  searchbarPlugins.reset('calculatorPlugin')

  try {
    const result = math.evaluate(text)
    if (result !== undefined) {
      searchbarPlugins.addResult('calculatorPlugin', {
        title: '∑',
        secondaryText: ` = ${result.toString()}`,
      })
    }

    const container = searchbarPlugins.getContainer('calculatorPlugin')

    if (container.childNodes.length === 1) {
      const item = container.childNodes[0]
      item.setAttribute('title', 'Click to copy')
      item.addEventListener('click', (e) => {
        const text = e.target.innerText
        clipboard.writeText(text.slice(text.indexOf('=')+2))
      })
    }
  } catch (e) { }
}

function initialize () {
  searchbarPlugins.register('calculatorPlugin', {
    index: 1,
    trigger: function (text) {
      return text.length > 2 && /^[0-9.\-+*/()%^]+$/i.test(text)
    },
    showResults: debounce(doMath, 200)
  })
}

module.exports = { initialize }
