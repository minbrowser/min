var browserUI = require('api-wrapper.js')
var focusMode = require('focusMode.js')

const createTaskContainer = require("taskOverlay/taskOverlayBuilder.js")

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
    direction: 'vertical'
  }),
  taskDragula: dragula({
    direction: 'vertical',
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

    tabBar.leaveEditMode()

    this.isShown = true
    taskSwitcherButton.classList.add('active')

    this.tabDragula.containers = []
    empty(taskContainer)

    // show the task elements
    tasks.get().forEach(function (task, index) {
      const el = createTaskContainer(task, index)

      taskContainer.appendChild(el)
      taskOverlay.tabDragula.containers.push(el.getElementsByClassName('task-tabs-container')[0])
    })

    // scroll to the selected element and focus it

    var currentTabElement = document.querySelector('.task-tab-item[data-tab="{id}"]'.replace('{id}', currentTask.tabs.getSelected()))

    if (currentTabElement) {
      currentTabElement.scrollIntoViewIfNeeded()
      currentTabElement.classList.add('fakefocus')
    }

    // un-hide the overlay
    this.overlayElement.hidden = false
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
      }, 150)

      this.tabDragula.containers = []

      document.body.classList.remove('task-overlay-is-shown')

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
// this was the old expanded mode gesture, so it's remapped to the overlay
document.getElementById('navbar').addEventListener('mousewheel', function (e) {
  if (e.deltaY < -30 && e.deltaX < 10) {
    taskOverlay.show()
    e.stopImmediatePropagation()
  }
})

function getTaskContainer (id) {
  return document.querySelector('.task-container[data-task="{id}"]'.replace('{id}', id))
}

/* rearrange tabs when they are dropped */

taskOverlay.tabDragula.on('drop', function (el, target, source, sibling) { // see https://github.com/bevacqua/dragula#drakeon-events
  var tabId = el.getAttribute('data-tab')
  if (sibling) {
    var adjacentTadId = sibling.getAttribute('data-tab')
  }

  var previousTask = tasks.get(source.getAttribute('data-task'))
  var newTask = tasks.get(target.getAttribute('data-task'))

  // remove tab from old task
  var oldTab = previousTask.tabs.splice(previousTask.tabs.getIndex(tabId), 1)[0]

  // if the old task has no tabs left in it, destroy it

  if (previousTask.tabs.length === 0) {
    browserUI.closeTask(previousTask.id)
    getTaskContainer(previousTask.id).remove()
  }

  // find where in the new task the tab should be inserted
  if (adjacentTadId) {
    var newIdx = newTask.tabs.getIndex(adjacentTadId)
  } else {
    // tab was inserted at end
    var newIdx = newTask.tabs.length
  }

  // insert the tab at the correct spot
  newTask.tabs.splice(newIdx, 0, oldTab)

  // update the visible tabs
  tabBar.rerenderAll()
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
    var newIdx = tasks.length
  }

  // reinsert the task
  tasks.splice(newIdx, 0, droppedTask)
})
