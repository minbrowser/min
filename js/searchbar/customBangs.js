/* list of the available custom !bangs */

var bangsPlugin = require('searchbar/bangsPlugin.js')

var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var places = require('places/places.js')
var contentBlockingToggle = require('navbar/contentBlockingToggle.js')
var taskOverlay = require('taskOverlay/taskOverlay.js')
var bookmarkConverter = require('bookmarkConverter.js')

function initialize () {
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
    phrase: '!importbookmarks',
    snippet: l('importBookmarks'),
    isAction: true,
    fn: function () {
      var filePath = electron.remote.dialog.showOpenDialogSync({
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
        bookmarkConverter.import(data)
      })
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!exportbookmarks',
    snippet: l('exportBookmarks'),
    isAction: true,
    fn: function () {
      bookmarkConverter.exportAll().then(function (data) {
      // save the result
        var savePath = electron.remote.dialog.showSaveDialogSync({ defaultPath: 'bookmarks.html' })
        require('fs').writeFileSync(savePath, data)
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
}

module.exports = { initialize }
