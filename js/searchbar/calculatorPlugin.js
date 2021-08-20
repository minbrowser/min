/*
  this plugin will provide the ability to perform simple calculations
*/

const { clipboard } = require('electron')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const Parser = require('expr-eval').Parser

const math = new Parser()
math.consts.pi = Math.PI
math.consts.e = Math.E

// get all expr-eval tokens (operators, constants, etc.)
const mathOps = {
  get all () {
    var ops = []
    for (const op of Object.keys(math)) {
      ops = ops.concat(Object.keys(math[op]))
    }
    return ops
  }
}

/* avoid processing input that is only numbers and spaces */
const validRegex = new RegExp(
  `^([ 0-9()[\\],;.]+|${
      mathOps.all.join('|')
        .replace(/([+*[\]/?^$])/g, '\\$1')
        .replace('||||', '|\\|\\||')
  })+$`
)

function doMath (text, input, event) {
  searchbarPlugins.reset('calculatorPlugin')
  var result

  try {
    result = math.evaluate(text).toString()
    if (result.includes('NaN')) {
      return
    }
  } catch (e) { return }

  searchbarPlugins.addResult('calculatorPlugin', {
    icon: 'carbon:calculator',
    title: result,
    descriptionBlock: l('clickToCopy')
  })

  const container = searchbarPlugins.getContainer('calculatorPlugin')

  if (container.childNodes.length === 1) {
    const item = container.childNodes[0]
    item.addEventListener('click', (e) => {
      const titleEl = item.querySelector('.title')
      const descriptionBlockEl = item.querySelector('.description-block')

      clipboard.writeText(titleEl.innerText)
      descriptionBlockEl.innerText = `${l('copied')}!`
    })
  }
}

function initialize () {
  searchbarPlugins.register('calculatorPlugin', {
    index: 1,
    trigger: function (text) {
      if (text.length < 3 || text.length > 100 || (
        !/__proto__|prototype|constructor/i.test(text) && // dangerous keywords
        !validRegex.test(text) // valid tokens
      )) {
        return false
      }

      try {
        const expression = math.parse(text)
        if (expression.tokens.length <= 1) {
          return false
        }
      } catch (e) { return false }
      return true
    },
    showResults: debounce(doMath, 200)
  })
}

module.exports = { initialize }
