const bangsPlugin = require('searchbar/bangsPlugin.js')

/* list of the available custom !bangs */
const webviews = require('webviews.js')
const browserUI = require('browserUI.js')
const focusMode = require('focusMode.js')
const searchbar = require('searchbar/searchbar.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const places = require('places/places.js')
const urlParser = require('util/urlParser.js')
const { db } = require('util/database.js')
const formatRelativeDate = require('util/relativeDate.js')
const contentBlockingToggle = require('navbar/contentBlockingToggle.js')

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
      ipc.send('saveViewCapture', { id: tabs.getSelected() })
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
      remote.session.fromPartition('persist:webcontent').clearStorageData({ origin: 'http://' })
        .then(function () {
          remote.session.fromPartition('persist:webcontent').clearStorageData({ origin: 'https://' })
        })
    }
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!enableblocking',
  snippet: l('enableBlocking'),
  isAction: true,
  fn: function (text) {
    contentBlockingToggle.enableBlocking(tabs.get(tabs.getSelected()).url)
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!disableblocking',
  snippet: l('disableBlocking'),
  isAction: true,
  fn: function (text) {
    contentBlockingToggle.disableBlocking(tabs.get(tabs.getSelected()).url)
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

    const task = getTaskByNameOrNumber(text)

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

    const currentTab = tabs.get(tabs.getSelected())
    tabs.destroy(currentTab.id)

    // make sure the task has at least one tab in it
    if (tabs.count() === 0) {
      tabs.add()
    }

    var newTask = getTaskByNameOrNumber(text)

    if (newTask) {
      newTask.tabs.add(currentTab, { atEnd: true })
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
    const currentTask = tasks.getSelected()
    let taskToClose

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

      let lastRelativeDate = '' // used to generate headings

      results.sort(function (a, b) {
        // order by last visit
        return b.lastVisit - a.lastVisit
      }).slice(0, 250).forEach(function (result, index) {
        const thisRelativeDate = formatRelativeDate(result.lastVisit)
        if (thisRelativeDate !== lastRelativeDate) {
          searchbarPlugins.addHeading('bangs', { text: thisRelativeDate })
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
    }, { limit: Infinity })
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
    }, { limit: Infinity })
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!importbookmarks',
  snippet: l('importBookmarks'),
  isAction: true,
  fn: function () {
    const filePath = electron.remote.dialog.showOpenDialogSync({
      filters: [
        { name: 'HTML files', extensions: ['htm', 'html'] }
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
      const tree = new DOMParser().parseFromString(data, 'text/html')
      const bookmarks = Array.from(tree.getElementsByTagName('a'))
      bookmarks.forEach(function (bookmark) {
        const url = bookmark.getAttribute('href')
        if (!url || (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('file:'))) {
          return
        }

        const data = {
          title: bookmark.textContent,
          isBookmarked: true
        }
        try {
          data.lastVisit = parseInt(bookmark.getAttribute('add_date')) * 1000
        } catch (e) {}
        let parent = bookmark.parentElement
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
    const root = document.createElement('body')
    const heading = document.createElement('h1')
    heading.textContent = 'Bookmarks'
    root.appendChild(heading)
    const innerRoot = document.createElement('dl')
    root.appendChild(innerRoot)

    const folderRoot = document.createElement('dt')
    innerRoot.appendChild(folderRoot)
    const folderHeading = document.createElement('h3')
    folderHeading.textContent = 'Min Bookmarks'
    folderRoot.appendChild(folderHeading)
    const folderBookmarksList = document.createElement('dl')
    folderRoot.appendChild(folderBookmarksList)

    db.places.each(function (item) {
      if (item.isBookmarked) {
        const itemRoot = document.createElement('dt')
        const a = document.createElement('a')
        itemRoot.appendChild(a)
        folderBookmarksList.appendChild(itemRoot)

        a.href = urlParser.getSourceURL(item.url)
        a.setAttribute('add_date', Math.round(item.lastVisit / 1000))
        a.textContent = item.title
        // Chrome will only parse the file if it contains newlines after each bookmark
        const textSpan = document.createTextNode('\n')
        folderBookmarksList.appendChild(textSpan)
      }
    }).then(function () {
      // save the result
      const savePath = electron.remote.dialog.showSaveDialogSync({ defaultPath: 'bookmarks.html' })
      require('fs').writeFileSync(savePath, root.outerHTML)
    })
  }
})

bangsPlugin.registerCustomBang({
  phrase: '!addbookmark',
  snippet: l('addBookmark'),
  fn: function (text) {
    const url = tabs.get(tabs.getSelected()).url
    if (url) {
      places.updateItem(url, {
        isBookmarked: true,
        tags: (text ? text.split(/\s/g).map(t => t.replace('#', '').trim()) : [])
      })
    }
  }
})
