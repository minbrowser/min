const { ipcRenderer } = require('electron')

var webviews = require('webviews.js')
var keybindings = require('keybindings.js')
var browserUI = require('browserUI.js')
var tabBar = require('navbar/tabBar.js')
var tabEditor = require('navbar/tabEditor.js')
var focusMode = require('focusMode.js')
var modalMode = require('modalMode.js')
var keyboardNavigationHelper = require('util/keyboardNavigationHelper.js')
var Sortable = require('sortablejs')

const createTaskContainer = require('taskOverlay/taskOverlayBuilder.js')

var taskContainer = document.getElementById('task-area')
var taskSwitcherButton = document.getElementById('switch-task-button')
var addTaskButton = document.getElementById('add-task')
var addTaskLabel = addTaskButton.querySelector('span')
var taskOverlayNavbar = document.getElementById('task-overlay-navbar')

function addTaskFromMenu () {
  /* new tasks can't be created in modal mode */
  if (modalMode.enabled()) {
    return
  }

  /* new tasks can't be created in focus mode or modal mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  browserUI.addTask()
  taskOverlay.show()
  setTimeout(function () {
    taskOverlay.hide()
    tabEditor.show(tabs.getSelected())
  }, 600)
}

function deleteTabFromOverlay (item) {
  var itemIsFocused = item.classList.contains('fakefocus') || (document.activeElement === item)
  var successorTab = item.previousElementSibling || item.nextElementSibling
  if (!successorTab) {
    var allTabs = Array.from(document.querySelectorAll('.task-tab-item'))
    successorTab = allTabs[allTabs.indexOf(item) - 1] || allTabs[allTabs.indexOf(item) + 1]
  }

  var tabId = item.getAttribute('data-tab')

  var task = tasks.getTaskContainingTab(tabId)

  tasks.get(task.id).tabs.destroy(tabId)
  webviews.destroy(tabId)

  tabBar.updateAll()

  // if there are no tabs left, remove the task
  if (task.tabs.count() === 0) {
    // remove the task element from the overlay
    getTaskContainer(task.id).remove()
    // close the task
    browserUI.closeTask(task.id)
  }

  if (itemIsFocused && successorTab) {
    successorTab.focus()
  }
}

function getTaskContainer (id) {
  return document.querySelector('.task-container[data-task="{id}"]'.replace('{id}', id))
}

var taskOverlay = {
  overlayElement: document.getElementById('task-overlay'),
  isShown: false,
  sortableInstances: [],
  addTaskDragging: function () {
    const sortable = new Sortable(taskContainer, {
      group: 'overlay-tasks',
      draggable: '.task-container',
      ghostClass: 'task-drop-placeholder',
      scroll: true,
      scrollSensitivity: 100,
      forceAutoScrollFallback: true,
      scrollSpeed: 15,
      onEnd: function (e) {
        var droppedTaskId = e.item.getAttribute('data-task')
        const insertionPoint = Array.from(taskContainer.children).indexOf(e.item)

        // remove the task from the tasks list
        var droppedTask = tasks.splice(tasks.getIndex(droppedTaskId), 1)[0]

        // reinsert the task
        tasks.splice(insertionPoint, 0, droppedTask)
      }
    })
    taskOverlay.sortableInstances.push(sortable)
  },
  addTabDragging: function (el) {
    const sortable = new Sortable(el, {
      group: 'overlay-tabs',
      draggable: '.task-tab-item',
      ghostClass: 'tab-drop-placeholder',
      multiDrag: true,
      multiDragKey: (window.platformType === 'mac' ? 'Meta' : 'Ctrl'),
      selectedClass: 'dragging-selected',
      animation: 200,
      scroll: true,
      scrollSensitivity: 100,
      forceAutoScrollFallback: true,
      scrollSpeed: 15,
      onStart: function () {
        taskOverlay.overlayElement.classList.add('is-dragging-tab')
      },
      onEnd: function (e) {
        taskOverlay.overlayElement.classList.remove('is-dragging-tab')

        const items = (e.items.length === 0) ? [e.item] : e.items

        const sortedItems = Array.from(e.to.children).filter(item => items.some(item2 => item2 === item))

        var newTask
        // if dropping on "add task" button, create a new task
        if (e.to === addTaskButton) {
          // insert after current task
          let index
          if (tasks.getSelected()) {
            index = tasks.getIndex(tasks.getSelected().id) + 1
          }
          newTask = tasks.get(tasks.add({}, index))
        } else {
        // otherwise, find a source task to add this tab to
          newTask = tasks.get(e.to.getAttribute('data-task'))
        }

        sortedItems.forEach(function (item) {
          var tabId = item.getAttribute('data-tab')
          var previousTask = tasks.getTaskContainingTab(tabId) // note: can't use e.from here, because it contains only a single element and items could be coming from multiple tasks

          var oldTab = previousTask.tabs.splice(previousTask.tabs.getIndex(tabId), 1)[0]

          if (oldTab.selected) {
            // find a new tab in the old task to become the current one
            var mostRecentTab = previousTask.tabs.get().sort(function (a, b) {
              return b.lastActivity - a.lastActivity
            })[0]
            if (mostRecentTab) {
              previousTask.tabs.setSelected(mostRecentTab.id)
            }

            // shouldn't become selected in the new task
            oldTab.selected = false
          }

          // if the old task has no tabs left in it, destroy it

          if (previousTask.tabs.count() === 0) {
            browserUI.closeTask(previousTask.id)
            getTaskContainer(previousTask.id).remove()
          }

          if (e.to === addTaskButton) {
            item.remove()
          }

          var newIdx = Array.from(e.to.children).findIndex(t => t === item)

          // insert the tab at the correct spot
          newTask.tabs.splice(newIdx, 0, oldTab)
        })
        tabBar.updateAll()
        taskOverlay.render()
      }
    })
    taskOverlay.sortableInstances.push(sortable)
  },
  show: function () {
    /* disabled in focus mode */
    if (focusMode.enabled()) {
      focusMode.warn()
      return
    }

    webviews.requestPlaceholder('taskOverlay')

    document.body.classList.add('task-overlay-is-shown')
    document.body.setAttribute('data-context', 'taskOverlay')

    tabEditor.hide()

    document.getElementById('task-search-input').value = ''

    this.isShown = true
    taskSwitcherButton.classList.add('active')

    taskOverlay.render()

    // un-hide the overlay
    this.overlayElement.hidden = false

    // scroll to the selected element and focus it
    var currentTabElement = document.querySelector('.task-tab-item[data-tab="{id}"]'.replace('{id}', tasks.getSelected().tabs.getSelected()))

    if (currentTabElement) {
      currentTabElement.classList.add('fakefocus')
      currentTabElement.focus()
    }
  },
  render: function () {
    empty(taskContainer)
    this.sortableInstances.forEach(inst => inst.destroy())
    this.sortableInstances = []

    taskOverlay.addTabDragging(addTaskButton)
    taskOverlay.addTaskDragging()

    // show the task elements
    tasks.forEach(function (task, index) {
      const el = createTaskContainer(task, index, {
        tabSelect: function () {
          browserUI.switchToTask(task.id)
          browserUI.switchToTab(this.getAttribute('data-tab'))

          taskOverlay.hide()
        },
        tabDelete: function (item) {
          deleteTabFromOverlay(item)
        }
      })

      taskContainer.appendChild(el)
      taskOverlay.addTabDragging(el.querySelector('.task-tabs-container'))
    })
  },

  hide: function () {
    if (this.isShown) {
      this.isShown = false
      this.overlayElement.hidden = true

      // wait until the animation is complete to remove the tab elements
      setTimeout(function () {
        if (!taskOverlay.isShown) {
          empty(taskContainer)
          webviews.hidePlaceholder('taskOverlay')
        }
      }, 250)

      document.body.classList.remove('task-overlay-is-shown')
      document.body.removeAttribute('data-context')

      // close any tasks that are pending deletion

      var pendingDeleteTasks = document.body.querySelectorAll('.task-container.deleting')
      for (var i = 0; i < pendingDeleteTasks.length; i++) {
        browserUI.closeTask(pendingDeleteTasks[i].getAttribute('data-task'))
      }

      // if the current tab has been deleted, switch to the most recent one

      if (!tabs.getSelected()) {
        var mostRecentTab = tabs.get().sort(function (a, b) {
          return b.lastActivity - a.lastActivity
        })[0]

        if (mostRecentTab) {
          browserUI.switchToTab(mostRecentTab.id)
        }
      }

      // force the UI to rerender
      browserUI.switchToTask(tasks.getSelected().id)
      browserUI.switchToTab(tabs.getSelected())

      taskSwitcherButton.classList.remove('active')
    }
  },

  toggle: function () {
    if (this.isShown) {
      this.hide()
    } else {
      this.show()
    }
  },

  initializeSearch: function () {
    var container = document.querySelector('.task-search-input-container')
    var input = document.getElementById('task-search-input')

    input.placeholder = l('tasksSearchTabs') + ' (T)'

    container.addEventListener('click', e => { e.stopPropagation(); input.focus() })

    taskOverlay.overlayElement.addEventListener('keyup', function (e) {
      if (e.key.toLowerCase() === 't' && document.activeElement.tagName !== 'INPUT') {
        input.focus()
      }
    })

    input.addEventListener('input', function (e) {
      var search = input.value.toLowerCase().trim()

      if (!search) {
        // reset the overlay
        taskOverlay.render()
        input.focus()
        return
      }

      var totalTabMatches = 0

      tasks.forEach(function (task) {
        var taskContainer = document.querySelector(`.task-container[data-task="${task.id}"]`)

        var taskTabMatches = 0
        task.tabs.forEach(function (tab) {
          var tabContainer = document.querySelector(`.task-tab-item[data-tab="${tab.id}"]`)

          var searchText = (task.name + ' ' + tab.title + ' ' + tab.url).toLowerCase()

          const searchMatches = search.split(' ').every(word => searchText.includes(word))
          if (searchMatches) {
            tabContainer.hidden = false
            taskTabMatches++
            totalTabMatches++

            if (totalTabMatches === 1) {
              // first match
              tabContainer.classList.add('fakefocus')
            } else {
              tabContainer.classList.remove('fakefocus')
            }
          } else {
            tabContainer.hidden = true
          }
        })

        if (taskTabMatches === 0) {
          taskContainer.hidden = true
        } else {
          taskContainer.hidden = false
          taskContainer.classList.remove('collapsed')
        }
      })
    })

    input.addEventListener('keypress', function (e) {
      if (e.keyCode === 13) {
        var firstTab = taskOverlay.overlayElement.querySelector('.task-tab-item:not([hidden])')
        if (firstTab) {
          firstTab.click()
        }
      }
    })
  },
  initialize: function () {
    this.initializeSearch()

    keyboardNavigationHelper.addToGroup('taskOverlay', taskOverlay.overlayElement)

    // swipe down on the tabstrip to show the task overlay
    document.getElementById('navbar').addEventListener('wheel', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // https://github.com/minbrowser/min/issues/698
        return
      }
      if (e.deltaY < -30 && e.deltaX < 10) {
        taskOverlay.show()
        e.stopImmediatePropagation()
      }
    })

    keybindings.defineShortcut('toggleTasks', function () {
      if (taskOverlay.isShown) {
        taskOverlay.hide()
      } else {
        taskOverlay.show()
      }
    })

    keybindings.defineShortcut({ keys: 'esc' }, function (e) {
      taskOverlay.hide()
    })

    keybindings.defineShortcut('enterEditMode', function (e) {
      taskOverlay.hide()
    })

    keybindings.defineShortcut('closeTab', function (e) {
      var focusedTab = (document.querySelector('.task-tab-item.fakefocus') || document.activeElement)
      if (focusedTab && focusedTab.getAttribute('data-tab')) {
        deleteTabFromOverlay(focusedTab)
        focusedTab.remove()
      }
    }, { contexts: ['taskOverlay'] })

    keybindings.defineShortcut('addTask', addTaskFromMenu)
    ipcRenderer.on('addTask', addTaskFromMenu) // for menu item

    taskSwitcherButton.title = l('viewTasks')
    addTaskLabel.textContent = l('newTask')

    taskSwitcherButton.addEventListener('click', function () {
      taskOverlay.toggle()
    })

    addTaskButton.addEventListener('click', function (e) {
      browserUI.addTask()
      taskOverlay.hide()
      tabEditor.show(tabs.getSelected())
    })

    taskOverlayNavbar.addEventListener('click', function () {
      taskOverlay.hide()
    })

    tasks.on('state-sync-change', function () {
      if (taskOverlay.isShown) {
        taskOverlay.render()
      }
    })
  }
}

module.exports = taskOverlay
