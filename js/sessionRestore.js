var browserUI = require('browserUI.js')
var webviews = require('webviews.js')
var tabEditor = require('navbar/tabEditor.js')
var tabState = require('tabState.js')
var settings = require('util/settings/settings.js')
var taskOverlay = require('taskOverlay/taskOverlay.js')
const writeFileAtomic = require('write-file-atomic')
const statistics = require('js/statistics.js')

const sessionRestore = {
  savePath: window.globalArgs['user-data-path'] + (platformType === 'windows' ? '\\sessionRestore.json' : '/sessionRestore.json'),
  previousState: null,
  save: function (forceSave, sync) {
    //only one window (the focused one) should be responsible for saving session restore data
    if (!document.body.classList.contains('focused')) {
      return
    }

    var stateString = JSON.stringify(tasks.getStringifyableState())
    var data = {
      version: 2,
      state: JSON.parse(stateString),
      saveTime: Date.now()
    }

    // save all tabs that aren't private

    for (var i = 0; i < data.state.tasks.length; i++) {
      data.state.tasks[i].tabs = data.state.tasks[i].tabs.filter(function (tab) {
        return !tab.private
      })
    }

    //if startupTabOption is "open a new blank task", don't save any tabs in the current task
    if (settings.get('startupTabOption') === 3) {
      for (var i = 0; i < data.state.tasks.length; i++) {
        if (tasks.get(data.state.tasks[i].id).selectedInWindow) { //need to re-fetch the task because temporary properties have been removed
          data.state.tasks[i].tabs = []
        }
      }
    }

    if (forceSave === true || stateString !== sessionRestore.previousState) {
      if (sync === true) {
        writeFileAtomic.sync(sessionRestore.savePath, JSON.stringify(data), {})
      } else {
        writeFileAtomic(sessionRestore.savePath, JSON.stringify(data), {}, function (err) {
          if (err) {
            console.warn(err)
            statistics.incrementValue('sessionRestoreSaveAsyncWriteErrors')
          }
        })
      }
      sessionRestore.previousState = stateString
    }
  },
  restoreFromFile: function () {
    var savedStringData
    try {
      savedStringData = fs.readFileSync(sessionRestore.savePath, 'utf-8')
    } catch (e) {
      console.warn('failed to read session restore data', e)
    }

    var startupConfigOption = settings.get('startupTabOption') || 2
    /*
    1 - reopen last task
    2 - open new task, keep old tabs in background
    3 - discard old tabs and open new task
    */

    /*
    Disabled - show a user survey on startup
    // the survey should only be shown after an upgrade from an earlier version
    var shouldShowSurvey = false
    if (savedStringData && !localStorage.getItem('1.15survey')) {
      shouldShowSurvey = true
    }
    localStorage.setItem('1.15survey', 'true')
    */

    try {
      // first run, show the tour
      if (!savedStringData) {
        tasks.setSelected(tasks.add()) // create a new task

        var newTab = tasks.getSelected().tabs.add({
            url: 'https://minbrowser.github.io/min/tour'
        })
        browserUI.addTab(newTab, {
         enterEditMode: false
        })
        return
      }

      var data = JSON.parse(savedStringData)

      // the data isn't restorable
      if ((data.version && data.version !== 2) || (data.state && data.state.tasks && data.state.tasks.length === 0)) {
        tasks.setSelected(tasks.add())

        browserUI.addTab(tasks.getSelected().tabs.add())
        return
      }

      // add the saved tasks

      data.state.tasks.forEach(function (task) {
        // restore the task item
        tasks.add(task)

        /*
        If the task contained only private tabs, none of the tabs will be contained in the session restore data, but tasks must always have at least 1 tab, so create a new empty tab if the task doesn't have any.
        */
        if (task.tabs.length === 0) {
          tasks.get(task.id).tabs.add()
        }
      })

      var mostRecentTasks = tasks.slice().sort((a, b) => {
        return tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)
      })
      if (mostRecentTasks.length > 0) {
        tasks.setSelected(mostRecentTasks[0].id)
      }

      // switch to the previously selected tasks

      if (tasks.getSelected().tabs.isEmpty() || startupConfigOption === 1) {
        browserUI.switchToTask(mostRecentTasks[0].id)
        if (tasks.getSelected().tabs.isEmpty()) {
          tabEditor.show(tasks.getSelected().tabs.getSelected())
        }
      } else {
        window.createdNewTaskOnStartup = true
        // try to reuse a previous empty task
        var lastTask = tasks.byIndex(tasks.getLength() - 1)
        if (lastTask && lastTask.tabs.isEmpty() && !lastTask.name) {
          browserUI.switchToTask(lastTask.id)
          tabEditor.show(lastTask.tabs.getSelected())
        } else {
          browserUI.addTask()
        }
      }

      /* Disabled - show user survey
      // if this isn't the first run, and the survey popup hasn't been shown yet, show it
      if (shouldShowSurvey) {
        fetch('https://minbrowser.org/survey/survey15.json').then(function (response) {
          return response.json()
        }).then(function (data) {
          setTimeout(function () {
            if (data.available && data.url) {
              if (tasks.getSelected().tabs.isEmpty()) {
                webviews.update(tasks.getSelected().tabs.getSelected(), data.url)
                tabEditor.hide()
              } else {
                var surveyTab = tasks.getSelected().tabs.add({
                  url: data.url
                })
                browserUI.addTab(surveyTab, {
                  enterEditMode: false
                })
              }
            }
          }, 200)
        })
      }
      */
    } catch (e) {
      // an error occured while restoring the session data

      console.error('restoring session failed: ', e)

      var backupSavePath = require('path').join(window.globalArgs['user-data-path'], 'sessionRestoreBackup-' + Date.now() + '.json')

      writeFileAtomic.sync(backupSavePath, savedStringData, {})

      // destroy any tabs that were created during the restore attempt
      tabState.initialize()

      // create a new tab with an explanation of what happened
      var newTask = tasks.add()
      var newSessionErrorTab = tasks.get(newTask).tabs.add({
        url: 'min://app/pages/sessionRestoreError/index.html?backupLoc=' + encodeURIComponent(backupSavePath)
      })

      browserUI.switchToTask(newTask)
      browserUI.switchToTab(newSessionErrorTab)

      statistics.incrementValue('sessionRestorationErrors')
    }
  },
  syncWithWindow: function () {
    const data = ipc.sendSync('request-tab-state')
    console.log('got from window', data)

    data.tasks.forEach(function (task) {
      // restore the task item
      tasks.add(task, undefined, false)
    })

    if (Object.hasOwn(window.globalArgs, 'initial-task')) {
      browserUI.switchToTask(window.globalArgs['initial-task'])
      return
    }

    // reuse an existing task or create a new task in this window
    // same as windowSync.js
    var newTaskCandidates = tasks.filter(task => task.tabs.isEmpty() && !task.selectedInWindow && !task.name)
      .sort((a, b) => {
        return tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)
      })
    if (newTaskCandidates.length > 0) {
      browserUI.switchToTask(newTaskCandidates[0].id)
      tabEditor.show(tasks.getSelected().tabs.getSelected())
    } else {
      browserUI.addTask()
    }
  },
  restore: function () {
    if (Object.hasOwn(window.globalArgs, 'initial-window')) {
      sessionRestore.restoreFromFile()
    } else {
      sessionRestore.syncWithWindow()
    }
    if (settings.get('newWindowOption') === 2 && !Object.hasOwn(window.globalArgs, 'launch-window') && !Object.hasOwn(window.globalArgs, 'initial-task')) {
      taskOverlay.show()
    }
  },
  initialize: function () {
    setInterval(sessionRestore.save, 30000)

    window.onbeforeunload = function (e) {
      sessionRestore.save(true, true)
      //workaround for notifying the other windows that the task open in this window isn't open anymore.
      //This should ideally be done in windowSync, but it needs to run synchronously, which windowSync doesn't
      ipc.send('tab-state-change', [
        ['task-updated', tasks.getSelected().id, 'selectedInWindow', null]
      ])
    }

    ipc.on('read-tab-state', function (e) {
      ipc.send('return-tab-state', tasks.getCopyableState())
    })
  }
}

module.exports = sessionRestore
