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
    webviews.update(tabs.getSelected(), 'file://' + __dirname + '/pages/settings/index.html')
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!back',
  snippet: l('goBack'),
  isAction: true,
  fn: function (text) {
    webviews.callAsync(tabs.getSelected(), 'goBack')
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!forward',
  snippet: l('goForward'),
  isAction: true,
  fn: function (text) {
    webviews.callAsync(tabs.getSelected(), 'goForward')
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!screenshot',
  snippet: l('takeScreenshot'),
  isAction: true,
  fn: function (text) {
    setTimeout(function () { // wait so that the view placeholder is hidden
      webviews.get(tabs.getSelected()).capturePage().then(function (image) {
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
      /* It's important not to delete data from file:// here, since that would also remove internal browser data (such as bookmarks) */
      remote.session.defaultSession.clearStorageData({origin: 'http://'})
      .then(function () {
        remote.session.defaultSession.clearStorageData({origin: 'https://'})
      })
    }
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!enableblocking',
  snippet: l('enableBlocking'),
  isAction: true,
  fn: function (text) {
    var url = tabs.get(tabs.getSelected()).url
    if (!url) {
      return
    }
    var domain = new URL(url).hostname

    var setting = settings.get('filtering')
    if (!setting) {
      setting = {}
    }
    if (!setting.exceptionDomains) {
      setting.exceptionDomains = []
    }
    setting.exceptionDomains = setting.exceptionDomains.filter(d => d.replace(/^www\./g, '') !== domain.replace(/^www\./g, ''))
    settings.set('filtering', setting)
    webviews.callAsync(tabs.getSelected(), 'reload')
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!disableblocking',
  snippet: l('disableBlocking'),
  isAction: true,
  fn: function (text) {
    var url = tabs.get(tabs.getSelected()).url
    if (!url) {
      return
    }
    var domain = new URL(url).hostname

    var setting = settings.get('filtering')
    if (!setting) {
      setting = {}
    }
    if (!setting.exceptionDomains) {
      setting.exceptionDomains = []
    }
    // make sure the domain isn't already an exception
    if (!setting.exceptionDomains.some(d => d.replace(/^www\./g, '') === domain.replace(/^www\./g, ''))) {
      setting.exceptionDomains.push(domain)
    }
    settings.set('filtering', setting)
    webviews.callAsync(tabs.getSelected(), 'reload')
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
  phrase: '!importbookmarks',
  snippet: l('importBookmarks'),
  isAction: true,
  fn: function () {
    var filePath = electron.remote.dialog.showOpenDialogSync({
      filters: [
        {name: 'HTML files', extensions: ['htm', 'html']}
      ]
    })
    if (!filePath) {
      return
    }
    fs.readFile(filePath[0], 'utf-8', function (err, data) {
      if (err || !data) {
        console.warn(err)
        return
      }
      var tree = new DOMParser().parseFromString(data, 'text/html')
      var bookmarks = Array.from(tree.getElementsByTagName('a'))
      bookmarks.forEach(function (bookmark) {
        var url = bookmark.getAttribute('href')
        if (!url || (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('file:'))) {
          return
        }

        var data = {
          title: bookmark.textContent,
          isBookmarked: true
        }
        try {
          data.lastVisit = parseInt(bookmark.getAttribute('add_date')) * 1000
        } catch (e) {}
        var parent = bookmark.parentElement
        while (parent != null) {
          if (parent.children[0] && parent.children[0].tagName === 'H3') {
            data.tags = [parent.children[0].textContent.replace(/\s/g, '-')]
            break
          }
          parent = parent.parentElement
        }
        places.updateItem(url, data)
      })
    })
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

bangsPlugin.registerCustomBang({
  phrase: '!addbookmark',
  snippet: l('addBookmark'),
  fn: function (text) {
    var url = tabs.get(tabs.getSelected()).url
    if (url) {
      places.updateItem(url, {
        isBookmarked: true,
        tags: (text ? text.split(/\s/g).map(t => t.replace('#', '').trim()) : [])
      })
    }
  }
})
