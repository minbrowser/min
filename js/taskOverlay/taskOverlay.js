var taskContainer = document.getElementById('task-area')
var taskSwitcherButton = document.getElementById('switch-task-button')
var addTaskButton = document.getElementById('add-task')
var addTaskLabel = addTaskButton.querySelector('span')
var taskOverlayNavbar = document.getElementById('task-overlay-navbar')

taskSwitcherButton.title = l('viewTasks')
addTaskLabel.textContent = l('newTask')

function addTask () {
  tasks.setSelected(tasks.add())
  taskOverlay.hide()

  rerenderTabstrip()
  addTab()
}

taskSwitcherButton.addEventListener('click', function () {
  taskOverlay.toggle()
})

addTaskButton.addEventListener('click', function (e) {
  switchToTask(tasks.add())
  taskOverlay.hide()
})

taskOverlayNavbar.addEventListener('click', function () {
  taskOverlay.hide()
})

var dragula = require('dragula')

var taskOverlay = {
  overlayElement: document.getElementById('task-overlay'),

  isShown: false,
  dragula: dragula({
    direction: 'vertical'
  }),

  show: function () {
    /* disabled in focus mode */
    if (isFocusMode) {
      showFocusModeError()
      return
    }

    document.body.classList.add('task-overlay-is-shown')

    leaveTabEditMode()

    this.isShown = true
    taskSwitcherButton.classList.add('active')

    this.dragula.containers = []
    empty(taskContainer)

    // show the task elements
    tasks.get().forEach(function (task, index) {
      var el = window.task_container_build_func(task, index)

      taskContainer.appendChild(el)
      taskOverlay.dragula.containers.push(el.getElementsByClassName('task-tabs-container')[0])
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

      document.body.classList.remove('task-overlay-is-shown')

      // if the current task has been deleted, switch to the most recent task
      if (!tasks.get(currentTask.id)) {

        // find the last activity of each remaining task
        var recentTaskList = []

        tasks.get().forEach(function (task) {
          recentTaskList.push({id: task.id, lastActivity: tasks.getLastActivity(task.id)})
        })

        // sort the tasks based on how recent they are
        recentTaskList.sort(function (a, b) {
          return b.lastActivity - a.lastActivity
        })

        switchToTask(recentTaskList[0].id)
      }

      // if the current tab has been deleted, switch to the most recent one

      if (!tabs.getSelected()) {
        var mostRecentTab = tabs.get().sort(function (a, b) {
          return b.lastActivity - a.lastActivity
        })[0]

        if (mostRecentTab) {
          switchToTab(mostRecentTab.id)
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
navbar.addEventListener('mousewheel', function (e) {
  if (e.deltaY < -30 && e.deltaX < 10) {
    taskOverlay.show()
    e.stopImmediatePropagation()
  }
})

function getTaskContainer (id) {
  return document.querySelector('.task-container[data-task="{id}"]'.replace('{id}', id))
}

function syncStateAndOverlay () {

  // get a list of all of the currently open tabs and tasks

  var tabSet = {}
  var taskSet = {}

  tasks.get().forEach(function (task) {
    taskSet[task.id] = task
    task.tabs.get().forEach(function (tab) {
      tabSet[tab.id] = tab
    })
  })

  var selectedTask = currentTask.id

  // destroy the old tasks
  tasks.destroyAll()

  // add the new tasks, in the order that they are listed in the overlay

  var taskElements = taskContainer.getElementsByClassName('task-container')

  for (var i = 0; i < taskElements.length; i++) {
    tasks.add(taskSet[taskElements[i].getAttribute('data-task')])
  }

  tasks.setSelected(selectedTask)

  // loop through each task

  tasks.get().forEach(function (task) {
    var container = getTaskContainer(task.id)

    // if the task still exists, update the tabs
    if (container) {
      // remove all of the old tabs
      task.tabs.destroyAll()

      // add the new tabs
      var newTabs = container.getElementsByClassName('task-tab-item')

      if (newTabs.length !== 0) {
        for (var i = 0; i < newTabs.length; i++) {
          task.tabs.add(tabSet[newTabs[i].getAttribute('data-tab')])
          // update the data-task attribute of the tab element
          newTabs[i].setAttribute('data-task', task.id)
        }
      } else {
        // the task has no tabs, remove it

        destroyTask(task.id)
        container.remove()
      }
    } else {
      // the task no longer exists, remove it

      destroyTask(task.id)
    }
  })
}

taskOverlay.dragula.on('drop', syncStateAndOverlay)

