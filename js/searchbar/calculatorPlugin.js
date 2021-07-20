/*
  this plugin will provide the ability to perform simple calculations or to
  convert to different types of units (ie. 12 lbs to kg = 5.44310844 kg)
*/

const { clipboard } = require('electron')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const { create, all } = require('mathjs')

const math = create(all)
const mathEval = math.evaluate
const disabledFunc = () => { }
const disabledFuncs = {
  import: disabledFunc,
  createUnit: disabledFunc,
  evaluate: disabledFunc,
  parse: disabledFunc,
  simplify: disabledFunc,
  derivative: disabledFunc
}

math.import(disabledFuncs, { override: true })

function doMath (text, input, event) {
  searchbarPlugins.reset('calculatorPlugin')

  var result
  try {
    result = mathEval(text)
  } catch (e) { return }

  searchbarPlugins.addResult('calculatorPlugin', {
    title: '∑',
    secondaryText: ` = ${result.toString()}`
  })

  const container = searchbarPlugins.getContainer('calculatorPlugin')

  if (container.childNodes.length === 1) {
    const item = container.childNodes[0]
    item.setAttribute('title', l('clickToCopy'))
    item.addEventListener('click', (e) => {
      const text = e.target.innerText
      clipboard.writeText(text.slice(text.indexOf('=') + 2))
    })
  }
}

function initialize () {
  searchbarPlugins.register('calculatorPlugin', {
    index: 1,
    trigger: function (text) {
      if (text.length <= 2) {
        return false
      }

      // avoid returning disable functions
      for (const fn of Object.keys(disabledFuncs)) {
        if (text.indexOf(fn) !== -1) {
          return false
        }
      }
      try { math.parse(text) } catch (e) { return false }
      return true
    },
    showResults: debounce(doMath, 200)
  })
}

module.exports = { initialize }
