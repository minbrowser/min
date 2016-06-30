/* list of the available custom !bangs */

registerCustomBang({
  phrase: '!settings',
  snippet: 'View Settings',
  isAction: true,
  fn: function (text) {
    navigate(tabs.getSelected(), 'file://' + __dirname + '/pages/settings/index.html')
  }
})

registerCustomBang({
  phrase: '!back',
  snippet: 'Go Back',
  isAction: true,
  fn: function (text) {
    try {
      getWebview(tabs.getSelected()).goBack()
    } catch(e) {}
  }
})

registerCustomBang({
  phrase: '!forward',
  snippet: 'Go Forward',
  isAction: true,
  fn: function (text) {
    try {
      getWebview(tabs.getSelected()).goForward()
    } catch(e) {}
  }
})

registerCustomBang({
  phrase: '!screenshot',
  snippet: 'Take a Screenshot',
  isAction: true,
  fn: function (text) {
    setTimeout(function () { // wait until the next frame so that the searchbar is hidden
      var rect = getWebview(tabs.getSelected()).getBoundingClientRect()

      var imageRect = {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }

      remote.getCurrentWindow().capturePage(imageRect, function (image) {
        remote.getCurrentWebContents().downloadURL(image.toDataURL())
      })
    }, 16)
  }
})

registerCustomBang({
  phrase: '!clearhistory',
  snippet: 'Clear All History',
  isAction: true,
  fn: function (text) {
    db.places.filter(function (item) {
      return item.isBookmarked === false
    }).delete()

    // restart the workers
    bookmarks.init()
  }
})

// returns a task with the same name or index ("1" returns the first task, etc.)
function getTaskByNameOrNumber (text) {
  var taskSet = tasks.get()

  var textAsNumber = parseInt(text)

  for (var i = 0; i < taskSet.length; i++) {
    if ((taskSet[i].name && taskSet[i].name.toLowerCase() === text) || i + 1 === textAsNumber) {
      return taskSet[i]
    }
  }
  return null
}

registerCustomBang({
  phrase: '!task',
  snippet: 'Switch to Task',
  isAction: false,
  fn: function (text) {

    /* disabled in focus mode */
    if (isFocusMode) {
      showFocusModeError()
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
      switchToTask(task.id)
    }
  }
})

registerCustomBang({
  phrase: '!newtask',
  snippet: 'Create a task',
  isAction: true,
  fn: function (text) {

    /* disabled in focus mode */
    if (isFocusMode) {
      showFocusModeError()
      return
    }

    taskOverlay.show()

    setTimeout(function () {
      addTaskFromOverlay()
      if (text) {
        currentTask.name = text
      }
    }, 600)
  }
})

registerCustomBang({
  phrase: '!movetotask',
  snippet: 'Move this tab to a task',
  isAction: false,
  fn: function (text) {

    /* disabled in focus mode */
    if (isFocusMode) {
      showFocusModeError()
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
    switchToTask(newTask.id)
    switchToTab(currentTab.id)

    setTimeout(function () {
      taskOverlay.hide()
    }, 600)
  }
})
