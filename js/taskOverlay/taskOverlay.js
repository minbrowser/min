var webviews = require('webviews.js')
var keybindings = require('keybindings.js')
var browserUI = require('browserUI.js')
var tabBar = require('navbar/tabBar.js')
var tabEditor = require('navbar/tabEditor.js')
var focusMode = require('focusMode.js')
var modalMode = require('modalMode.js')

const createTaskContainer = require('taskOverlay/taskOverlayBuilder.js')

var taskContainer = document.getElementById('task-area')
var taskSwitcherButton = document.getElementById('switch-task-button')
var addTaskButton = document.getElementById('add-task')
var addTaskLabel = addTaskButton.querySelector('span')
var taskOverlayNavbar = document.getElementById('task-overlay-navbar')

taskSwitcherButton.title = l('viewTasks')
addTaskLabel.textContent = l('newTask')

taskSwitcherButton.addEventListener('click', function () {
  taskOverlay.toggle()
})

addTaskButton.addEventListener('click', function (e) {
  browserUI.switchToTask(tasks.add())
  taskOverlay.hide()
})

taskOverlayNavbar.addEventListener('click', function () {
  taskOverlay.hide()
})

var dragula = require('dragula')

window.taskOverlay = {
  overlayElement: document.getElementById('task-overlay'),
  isShown: false,
  tabDragula: dragula({
    direction: 'vertical',
    mirrorContainer: document.getElementById('task-overlay'),
    moves: function (el, source, handle, sibling) {
      // trying to click buttons can cause them to be dragged by accident, so disable dragging on them
      var n = handle
      while (n) {
        if (n.tagName === 'BUTTON') {
          return false
        }
        n = n.parentElement
      }
      return true
    }
  }),
  taskDragula: dragula({
    direction: 'vertical',
    mirrorContainer: document.getElementById('task-overlay'),
    containers: [taskContainer],
    moves: function (el, source, handle, sibling) {
      // ignore drag events that come from a tab element, since they will be handled by the other dragula instance
      // also ignore inputs, since using them as drag handles breaks text selection
      var n = handle
      while (n) {
        if (n.classList.contains('task-tab-item') || n.tagName === 'INPUT') {
          return false
        }
        n = n.parentElement
      }
      return true
    }
  }),
  show: function () {
    /* disabled in focus mode */
    if (focusMode.enabled()) {
      focusMode.warn()
      return
    }

    webviews.requestPlaceholder('taskOverlay')

    document.body.classList.add('task-overlay-is-shown')

    tabEditor.hide()

    this.isShown = true
    taskSwitcherButton.classList.add('active')

    this.tabDragula.containers = [addTaskButton]
    empty(taskContainer)

    // show the task elements
    tasks.forEach(function (task, index) {
      const el = createTaskContainer(task, index)

      taskContainer.appendChild(el)
      taskOverlay.tabDragula.containers.push(el.getElementsByClassName('task-tabs-container')[0])
    })

    // scroll to the selected element and focus it

    var currentTabElement = document.querySelector('.task-tab-item[data-tab="{id}"]'.replace('{id}', tasks.getSelected().tabs.getSelected()))

    // un-hide the overlay
    this.overlayElement.hidden = false

    if (currentTabElement) {
      currentTabElement.classList.add('fakefocus')
      currentTabElement.focus()
    }
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

      this.tabDragula.containers = []

      document.body.classList.remove('task-overlay-is-shown')

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

      taskSwitcherButton.classList.remove('active')
    }
  },

  toggle: function () {
    if (this.isShown) {
      this.hide()
    } else {
      this.show()
    }
  }
}

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

keybindings.defineShortcut({keys: 'esc'}, function (e) {
  taskOverlay.hide()
})

keybindings.defineShortcut('enterEditMode', function (e) {
  taskOverlay.hide()
})

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

keybindings.defineShortcut('addTask', addTaskFromMenu)
ipc.on('addTask', addTaskFromMenu) // for menu item

function getTaskContainer (id) {
  return document.querySelector('.task-container[data-task="{id}"]'.replace('{id}', id))
}

/* rearrange tabs when they are dropped */

taskOverlay.tabDragula.on('drag', function () {
  taskOverlay.overlayElement.classList.add('is-dragging-tab')
})

taskOverlay.tabDragula.on('dragend', function () {
  taskOverlay.overlayElement.classList.remove('is-dragging-tab')
})

taskOverlay.tabDragula.on('over', function (el, container, source) {
  if (container === addTaskButton) {
    addTaskButton.classList.add('drag-target')
  }
})

taskOverlay.tabDragula.on('out', function (el, container, source) {
  if (container === addTaskButton) {
    addTaskButton.classList.remove('drag-target')
  }
})

taskOverlay.tabDragula.on('drop', function (el, target, source, sibling) { // see https://github.com/bevacqua/dragula#drakeon-events
  var tabId = el.getAttribute('data-tab')

  var previousTask = tasks.get(source.getAttribute('data-task'))

  // remove tab from old task
  var oldTab = previousTask.tabs.splice(previousTask.tabs.getIndex(tabId), 1)[0]

  // if the old task has no tabs left in it, destroy it

  if (previousTask.tabs.count() === 0) {
    browserUI.closeTask(previousTask.id)
    getTaskContainer(previousTask.id).remove()
  }

  // if dropping on "add task" button, create a new task
  if (target === addTaskButton) {
    var newTask = tasks.get(tasks.add())
    // remove from button, and re-create in overlay
    el.remove()
  } else {
    // otherwise, find a source task to add this tab to
    var newTask = tasks.get(target.getAttribute('data-task'))
  }

  if (sibling) {
    var adjacentTadId = sibling.getAttribute('data-tab')
  }

  // find where in the new task the tab should be inserted
  if (adjacentTadId) {
    var newIdx = newTask.tabs.getIndex(adjacentTadId)
  } else {
    // tab was inserted at end
    var newIdx = newTask.tabs.count()
  }

  // insert the tab at the correct spot
  newTask.tabs.splice(newIdx, 0, oldTab)

  tabBar.rerenderAll()
  taskOverlay.show()
})

/* rearrange tasks when they are dropped */

taskOverlay.taskDragula.on('drop', function (el, target, source, sibling) {
  var droppedTaskId = el.getAttribute('data-task')
  if (sibling) {
    var adjacentTaskId = sibling.getAttribute('data-task')
  }

  // remove the task from the tasks list
  var droppedTask = tasks.splice(tasks.getIndex(droppedTaskId), 1)[0]

  // find where it should be inserted
  if (adjacentTaskId) {
    var newIdx = tasks.getIndex(adjacentTaskId)
  } else {
    var newIdx = tasks.getLength()
  }

  // reinsert the task
  tasks.splice(newIdx, 0, droppedTask)
})

/* auto-scroll the container when the item is dragged to the edge of the screen */

var draggingScrollInterval = null

function onMouseMoveWhileDragging (e) {
  clearInterval(draggingScrollInterval)
  if (e.pageY < 100) {
    draggingScrollInterval = setInterval(function () {
      taskContainer.scrollBy(0, -5)
    }, 16)
  } else if (e.pageY > (window.innerHeight - 125)) {
    draggingScrollInterval = setInterval(function () {
      taskContainer.scrollBy(0, 5)
    }, 16)
  }
}

function startMouseDragRecording () {
  window.addEventListener('mousemove', onMouseMoveWhileDragging)
}

function endMouseDragRecording () {
  window.removeEventListener('mousemove', onMouseMoveWhileDragging)
  clearInterval(draggingScrollInterval)
}

taskOverlay.tabDragula.on('drag', function () {
  startMouseDragRecording()
})

taskOverlay.tabDragula.on('dragend', function () {
  endMouseDragRecording()
})

taskOverlay.taskDragula.on('drag', function () {
  startMouseDragRecording()
})

taskOverlay.taskDragula.on('dragend', function () {
  endMouseDragRecording()
})
