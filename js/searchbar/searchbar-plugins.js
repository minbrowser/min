var searchbarPlugins = [] // format is {name, container, trigger, showResults}
var searchbarResultCount = 0
var hasAutocompleted = false
var topAnswerArea = searchbar.querySelector('.top-answer-area')

// empties all containers in the searchbar
function clearSearchbar () {
  empty(topAnswerArea)
  for (var i = 0; i < searchbarPlugins.length; i++) {
    empty(searchbarPlugins[i].container)
  }
}

function setTopAnswer (pluginName, item) {
  empty(topAnswerArea)
  if (item) {
    item.setAttribute('data-plugin', pluginName)
    topAnswerArea.appendChild(item)
  }
}

function getSearchbarContainer (pluginName) {
  for (var i = 0; i < searchbarPlugins.length; i++) {
    if (searchbarPlugins[i].name === pluginName) {
      return searchbarPlugins[i].container
    }
  }
  return null
}

function getTopAnswer (pluginName) {
  if (pluginName) {
    // TODO a template string would be useful here, but UglifyJS doesn't support them yet
    return topAnswerArea.querySelector('[data-plugin={plugin}]'.replace('{plugin}', pluginName))
  } else {
    return topAnswerArea.firstChild
  }
}

function registerSearchbarPlugin (name, object) {
  // add the container
  var container = document.createElement('div')
  container.classList.add('searchbar-plugin-container')
  container.setAttribute('data-plugin', name)
  searchbar.insertBefore(container, searchbar.childNodes[object.index + 1])

  searchbarPlugins.push({
    name: name,
    container: container,
    trigger: object.trigger,
    showResults: object.showResults
  })
}

function runPlugins (text, input, event) {
  searchbarResultCount = 0
  hasAutocompleted = false

  for (var i = 0; i < searchbarPlugins.length; i++) {
    if ((!searchbarPlugins[i].trigger || searchbarPlugins[i].trigger(text))) {
      searchbarPlugins[i].showResults(text, input, event, searchbarPlugins[i].container)
    } else {
      empty(searchbarPlugins[i].container)

      // if the plugin is not triggered, remove a previously created top answer
      var associatedTopAnswer = getTopAnswer(searchbarPlugins[i].name)

      if (associatedTopAnswer) {
        associatedTopAnswer.remove()
      }
    }
  }
}
