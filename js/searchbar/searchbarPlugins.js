const searchbar = document.getElementById('searchbar')
const searchbarUtils = require('searchbar/searchbarUtils.js')

const plugins = [] // format is {name, container, trigger, showResults}
const results = {} // format is {pluginName: [results]}
let URLOpener
const URLHandlers = [] // format is {trigger, action}

let topAnswer = {
  plugin: null,
  item: null
}

const searchbarPlugins = {
  topAnswerArea: searchbar.querySelector('.top-answer-area'),
  // empties all containers in the searchbar
  clearAll: function () {
    empty(searchbarPlugins.topAnswerArea)
    topAnswer = {
      plugin: null,
      item: null
    }
    for (let i = 0; i < plugins.length; i++) {
      empty(plugins[i].container)
    }
  },

  reset: function (pluginName) {
    empty(searchbarPlugins.getContainer(pluginName))

    const ta = searchbarPlugins.getTopAnswer(pluginName)
    if (ta) {
      ta.remove()
      topAnswer = {
        plugin: null,
        item: null
      }
    }

    results[pluginName] = []
  },

  getTopAnswer: function (pluginName) {
    if (pluginName) {
      if (topAnswer.plugin === pluginName) {
        return topAnswer.item
      } else {
        return null
      }
    } else {
      return searchbarPlugins.topAnswerArea.firstChild
    }
  },

  setTopAnswer: function (pluginName, data) {
    empty(searchbarPlugins.topAnswerArea)

    const item = searchbarUtils.createItem(data)
    item.setAttribute('data-plugin', pluginName)
    item.setAttribute('data-url', data.url)
    searchbarPlugins.topAnswerArea.appendChild(item)

    item.addEventListener('click', function (e) {
      URLOpener(data.url, e)
    })

    topAnswer = {
      plugin: pluginName,
      item: item
    }

    results[pluginName].push(data)
  },

  addResult: function (pluginName, data, options = {}) {
    if (options.allowDuplicates) {
      data.allowDuplicates = true
    }
    if (data.url && !data.allowDuplicates) {
      // skip duplicates
      for (const plugin in results) {
        for (let i = 0; i < results[plugin].length; i++) {
          if (results[plugin][i].url === data.url && !results[plugin][i].allowDuplicates) {
            return
          }
        }
      }
    }
    const item = searchbarUtils.createItem(data)

    if (data.url) {
      item.setAttribute('data-url', data.url)
      item.addEventListener('click', function (e) {
        URLOpener(data.url, e)
      })
    }

    searchbarPlugins.getContainer(pluginName).appendChild(item)

    results[pluginName].push(data)
  },

  addHeading: function (pluginName, data) {
    searchbarPlugins.getContainer(pluginName).appendChild(searchbarUtils.createHeading(data))
  },

  getContainer: function (pluginName) {
    for (let i = 0; i < plugins.length; i++) {
      if (plugins[i].name === pluginName) {
        return plugins[i].container
      }
    }
    return null
  },

  register: function (name, object) {
    // add the container
    const container = document.createElement('div')
    container.classList.add('searchbar-plugin-container')
    container.setAttribute('data-plugin', name)
    searchbar.insertBefore(container, searchbar.childNodes[object.index + 2])

    plugins.push({
      name: name,
      container: container,
      trigger: object.trigger,
      showResults: object.showResults
    })

    results[name] = []
  },

  run: function (text, input, event) {
    for (let i = 0; i < plugins.length; i++) {
      try {
        if (plugins[i].showResults && (!plugins[i].trigger || plugins[i].trigger(text))) {
          plugins[i].showResults(text, input, event)
        } else {
          searchbarPlugins.reset(plugins[i].name)
        }
      } catch (e) {
        console.error('error in searchbar plugin "' + plugins[i].name + '":', e)
      }
    }
  },

  registerURLHandler: function (handler) {
    URLHandlers.push(handler)
  },

  runURLHandlers: function (text) {
    for (let i = 0; i < URLHandlers.length; i++) {
      if (URLHandlers[i](text)) {
        return true
      }
    }
    return false
  },

  getResultCount: function (pluginName) {
    if (pluginName) {
      return results[pluginName].length
    } else {
      let resultCount = 0
      for (const plugin in results) {
        resultCount += results[plugin].length
      }
      return resultCount
    }
  },

  initialize: function (opener) {
    URLOpener = opener
  }
}

module.exports = searchbarPlugins
