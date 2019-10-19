var bangsPlugin = require('searchbar/bangsPlugin.js')

/* list of the available custom !bangs */
var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var places = require('places/places.js')
var urlParser = require('util/urlParser.js')
var {db} = require('util/database.js')
var formatRelativeDate = require('util/relativeDate.js')

bangsPlugin.registerCustomBang({
  phrase: '!settings',
  snippet: l('viewSettings'),
  isAction: true,
  fn: function (text) {
    browserUI.navigate(tabs.getSelected(), 'file://' + __dirname + '/pages/settings/index.html')
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!back',
  snippet: l('goBack'),
  isAction: true,
  fn: function (text) {
    try {
      webviews.get(tabs.getSelected()).goBack()
    } catch (e) {}
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!forward',
  snippet: l('goForward'),
  isAction: true,
  fn: function (text) {
    try {
      webviews.get(tabs.getSelected()).goForward()
    } catch (e) {}
  }
})

bangsPlugin.registerCustomBang({
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

bangsPlugin.registerCustomBang({
  phrase: '!clearhistory',
  snippet: l('clearHistory'),
  isAction: true,
  fn: function (text) {
    if (confirm(l('clearHistoryConfirmation'))) {
      places.deleteAllHistory()
    }
  }
})

// returns a task with the same name or index ("1" returns the first task, etc.)
function getTaskByNameOrNumber (text) {
  const textAsNumber = parseInt(text)

  return tasks.find((task, index) => (task.name && task.name.toLowerCase() === text) || index + 1 === textAsNumber
  )
}

bangsPlugin.registerCustomBang({
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

bangsPlugin.registerCustomBang({
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
        tasks.getSelected().name = text
      }
    }, 600)
  }
})

bangsPlugin.registerCustomBang({
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
    if (tabs.count() === 0) {
      tabs.add()
    }

    var newTask = getTaskByNameOrNumber(text)

    if (newTask) {
      newTask.tabs.add(currentTab, {atEnd: true})
    } else {
      // create a new task with the given name
      var newTask = tasks.get(tasks.add(undefined, tasks.getIndex(tasks.getSelected().id) + 1))
      newTask.name = text

      newTask.tabs.add(currentTab)
    }

    browserUI.switchToTask(newTask.id)
    browserUI.switchToTab(currentTab.id)
    taskOverlay.show()

    setTimeout(function () {
      taskOverlay.hide()
    }, 600)
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!closetask',
  snippet: l('closeTask'),
  isAction: false,
  fn: function (text) {
    var currentTask = tasks.getSelected()
    var taskToClose

    if (text) {
      taskToClose = getTaskByNameOrNumber(text)
    } else {
      taskToClose = tasks.getSelected()
    }

    if (taskToClose) {
      browserUI.closeTask(taskToClose.id)
      if (currentTask.id === taskToClose.id) {
        taskOverlay.show()
        setTimeout(function () {
          taskOverlay.hide()
        }, 600)
      }
    }
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!nametask',
  snippet: l('nameTask'),
  isAction: false,
  fn: function (text) {
    tasks.getSelected().name = text
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!history',
  snippet: l('searchHistory'),
  isAction: false,
  showSuggestions: function (text, input, event) {
    places.searchPlaces(text, function (results) {
      searchbarPlugins.reset('bangs')

      var lastRelativeDate = '' // used to generate headings

      results.sort(function (a, b) {
        // order by last visit
        return b.lastVisit - a.lastVisit
      }).slice(0, 250).forEach(function (result, index) {
        var thisRelativeDate = formatRelativeDate(result.lastVisit)
        if (thisRelativeDate !== lastRelativeDate) {
          searchbarPlugins.addHeading('bangs', {text: thisRelativeDate})
          lastRelativeDate = thisRelativeDate
        }
        searchbarPlugins.addResult('bangs', {
          title: result.title,
          secondaryText: urlParser.getSourceURL(result.url),
          fakeFocus: index === 0 && text,
          url: result.url,
          delete: function () {
            places.deleteHistory(result.url)
          },
          showDeleteButton: true
        })
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

bangsPlugin.registerCustomBang({
  phrase: '!exportbookmarks',
  snippet: l('exportBookmarks'),
  isAction: true,
  fn: function () {
    // build the tree structure
    var root = document.createElement('body')
    var heading = document.createElement('h1')
    heading.textContent = 'Bookmarks'
    root.appendChild(heading)
    var innerRoot = document.createElement('dl')
    root.appendChild(innerRoot)

    var folderRoot = document.createElement('dt')
    innerRoot.appendChild(folderRoot)
    var folderHeading = document.createElement('h3')
    folderHeading.textContent = 'Min Bookmarks'
    folderRoot.appendChild(folderHeading)
    var folderBookmarksList = document.createElement('dl')
    folderRoot.appendChild(folderBookmarksList)

    db.places.each(function (item) {
      if (item.isBookmarked) {
        var itemRoot = document.createElement('dt')
        var a = document.createElement('a')
        itemRoot.appendChild(a)
        folderBookmarksList.appendChild(itemRoot)

        a.href = urlParser.getSourceURL(item.url)
        a.setAttribute('add_date', Math.round(item.lastVisit / 1000))
        a.textContent = item.title
        // Chrome will only parse the file if it contains newlines after each bookmark
        var textSpan = document.createTextNode('\n')
        folderBookmarksList.appendChild(textSpan)
      }
    }).then(function () {
      // save the result
      var savePath = electron.remote.dialog.showSaveDialogSync({defaultPath: 'bookmarks.html'})
      require('fs').writeFileSync(savePath, root.outerHTML)
    })
  }
})
