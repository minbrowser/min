/* list of the available custom !bangs */
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var searchbar = require('searchbar/searchbar.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var places = require('places/places.js')
const formatRelativeDate = require('util/relativeDate.js')

registerCustomBang({
  phrase: '!settings',
  snippet: l('viewSettings'),
  isAction: true,
  fn: function (text) {
    browserUI.navigate(tabs.getSelected(), 'file://' + __dirname + '/pages/settings/index.html')
  }
})

registerCustomBang({
  phrase: '!back',
  snippet: l('goBack'),
  isAction: true,
  fn: function (text) {
    try {
      webviews.get(tabs.getSelected()).goBack()
    } catch (e) {}
  }
})

registerCustomBang({
  phrase: '!forward',
  snippet: l('goForward'),
  isAction: true,
  fn: function (text) {
    try {
      webviews.get(tabs.getSelected()).goForward()
    } catch (e) {}
  }
})

registerCustomBang({
  phrase: '!screenshot',
  snippet: l('takeScreenshot'),
  isAction: true,
  fn: function (text) {
    setTimeout(function () { // wait so that the view placeholder is hidden
      webviews.get(tabs.getSelected()).capturePage(function (image) {
        remote.getCurrentWebContents().downloadURL(image.toDataURL())
      })
    }, 400)
  }
})

registerCustomBang({
  phrase: '!clearhistory',
  snippet: l('clearHistory'),
  isAction: true,
  fn: function (text) {
    places.deleteAllHistory()
  }
})

// returns a task with the same name or index ("1" returns the first task, etc.)
function getTaskByNameOrNumber (text) {
  const textAsNumber = parseInt(text)

  return tasks.find((task, index) =>
    (task.name && task.name.toLowerCase() === text) || index + 1 === textAsNumber
  )
}

registerCustomBang({
  phrase: '!task',
  snippet: l('switchToTask'),
  isAction: false,
  fn: function (text) {
    /* disabled in focus mode */
    if (focusMode.enabled()) {
      focusMode.warn()
      return
    }

    text = text.toLowerCase()

    // no task was specified, show all of the tasks
    if (!text) {
      taskOverlay.show()
      return
    }

    var task = getTaskByNameOrNumber(text)

    if (task) {
      browserUI.switchToTask(task.id)
    }
  }
})

registerCustomBang({
  phrase: '!newtask',
  snippet: l('createTask'),
  isAction: true,
  fn: function (text) {
    /* disabled in focus mode */
    if (focusMode.enabled()) {
      focusMode.warn()
      return
    }

    taskOverlay.show()

    setTimeout(function () {
      browserUI.addTask()
      if (text) {
        currentTask.name = text
      }
    }, 600)
  }
})

registerCustomBang({
  phrase: '!movetotask',
  snippet: l('moveToTask'),
  isAction: false,
  fn: function (text) {
    /* disabled in focus mode */
    if (focusMode.enabled()) {
      focusMode.warn()
      return
    }

    // remove the tab from the current task

    var currentTab = tabs.get(tabs.getSelected())
    tabs.destroy(currentTab.id)

    // make sure the task has at least one tab in it
    if (tabs.get().length === 0) {
      tabs.add()
    }

    var newTask = getTaskByNameOrNumber(text)

    if (newTask) {
      newTask.tabs.add(currentTab)
    } else {
      // create a new task with the given name
      var newTask = tasks.get(tasks.add())
      newTask.name = text

      newTask.tabs.add(currentTab)
    }

    taskOverlay.show()
    browserUI.switchToTask(newTask.id)
    browserUI.switchToTab(currentTab.id)

    setTimeout(function () {
      taskOverlay.hide()
    }, 600)
  }
})

registerCustomBang({
  phrase: '!bookmarks',
  snippet: l('searchBookmarks'),
  isAction: false,
  showSuggestions: function (text, input, event, container) {
    places.searchPlaces(text, function (results) {
      empty(container)

      var lastRelativeDate = '' // used to generate headings

      results.sort(function (a, b) {
        // order by last visit
        return b.lastVisit - a.lastVisit
      }).forEach(function (result) {
        var thisRelativeDate = formatRelativeDate(result.lastVisit)
        if (thisRelativeDate !== lastRelativeDate) {
          var heading = searchbarUtils.createHeading({text: thisRelativeDate})
          container.appendChild(heading)
          lastRelativeDate = thisRelativeDate
        }
        container.appendChild(searchbarUtils.createItem({
          title: result.title,
          icon: 'fa-star',
          secondaryText: result.url,
          url: result.url,
          delete: function () {
            places.deleteHistory(result.url)
          }
        }))
      })
    }, {searchBookmarks: true})
  },
  fn: function (text) {
    if (!text) {
      return
    }
    places.searchPlaces(text, function (results) {
      if (results.length !== 0) {
        results = results.sort(function (a, b) {
          return b.lastVisit - a.lastVisit
        })
        searchbar.openURL(results[0].url, null)
      }
    }, {searchBookmarks: true})
  }
})

registerCustomBang({
  phrase: '!history',
  snippet: l('searchHistory'),
  isAction: false,
  showSuggestions: function (text, input, event, container) {
    places.searchPlaces(text, function (results) {
      empty(container)

      var lastRelativeDate = '' // used to generate headings

      results.sort(function (a, b) {
        // order by last visit
        return b.lastVisit - a.lastVisit
      }).slice(0, 250).forEach(function (result) {
        var thisRelativeDate = formatRelativeDate(result.lastVisit)
        if (thisRelativeDate !== lastRelativeDate) {
          var heading = searchbarUtils.createHeading({text: thisRelativeDate})
          container.appendChild(heading)
          lastRelativeDate = thisRelativeDate
        }
        container.appendChild(searchbarUtils.createItem({
          title: result.title,
          secondaryText: result.url,
          url: result.url,
          delete: function () {
            places.deleteHistory(result.url)
          }
        }))
      })
    }, {limit: Infinity})
  },
  fn: function (text) {
    if (!text) {
      return
    }
    places.searchPlaces(text, function (results) {
      if (results.length !== 0) {
        results = results.sort(function (a, b) {
          return b.lastVisit - a.lastVisit
        })
        searchbar.openURL(results[0].url, null)
      }
    }, {limit: Infinity})
  }
})
