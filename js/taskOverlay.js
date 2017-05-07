function addTaskFromOverlay () {
  tasks.setSelected(tasks.add())
  taskOverlay.hide()

  rerenderTabstrip()
  addTab()
}

var taskContainer = document.getElementById('task-area')
var taskSwitcherButton = document.getElementById('switch-task-button')
var addTaskButton = document.getElementById('add-task')
var taskOverlayNavbar = document.getElementById('task-overlay-navbar')

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

/*
 * @TODO: Find a better name. Currently it's the same as TaskOverlayBuilder.create.tabElement
 */
function createTaskOverlayTabElement (tab, task) {
  return createSearchbarItem({
    title: tab.title || 'New Tab',
    secondaryText: urlParser.removeProtocol(tab.url),
    classList: ['task-tab-item'],
    delete: function () {
      task.tabs.destroy(tab.id)
      destroyWebview(tab.id)

      // if there are no tabs left, remove the task

      if (task.tabs.count() === 0) {
        destroyTask(task.id)
        if (tasks.get().length === 0) {
          addTaskFromOverlay()
        } else {
          // re-render the overlay to remove the task element
          getTaskContainer(task.id).remove()
        }
      }
    }
  })
}

var TaskOverlayBuilder = {
  create: {
    task: {
      nameInputField: function (task, taskIndex) {
        var input = document.createElement('input')
        input.classList.add('task-name')

        input.placeholder = 'Task ' + (taskIndex + 1)
        input.value = task.name || 'Task ' + (taskIndex + 1)

        input.addEventListener('keyup', function (e) {
          if (e.keyCode === 13) {
            this.blur()
          }
          tasks.update(task.id, {name: this.value})
        })

        input.addEventListener('focus', function () {
          this.select()
        })
        return input
      },

      deleteButton: function (container, task) {
        var deleteButton = document.createElement('i')
        deleteButton.className = 'fa fa-trash-o'

        deleteButton.addEventListener('click', function (e) {
          destroyTask(task.id)
          container.remove()

          if (tasks.get().length === 0) { // create a new task
            addTaskFromOverlay()
          }
        })
        return deleteButton
      },

      actionContainer: function (taskContainer, task, taskIndex) {
        var taskActionContainer = document.createElement('div')
        taskActionContainer.className = 'task-action-container'

        // add the input for the task name
        var input = this.nameInputField(task, taskIndex)
        taskActionContainer.appendChild(input)

        // add the delete button
        var deleteButton = this.deleteButton(taskContainer, task)
        taskActionContainer.appendChild(deleteButton)

        return taskActionContainer
      },
      container: function (task, taskIndex) {
        var container = document.createElement('div')
        container.className = 'task-container'
        container.setAttribute('data-task', task.id)

        var taskActionContainer = this.actionContainer(container, task, taskIndex)
        container.appendChild(taskActionContainer)

        var tabContainer = TaskOverlayBuilder.create.tab.container(task)
        container.appendChild(tabContainer)

        return container
      },
    },

    tab: {
      element: function (tabContainer, task, tab) {
        var el = createTaskOverlayTabElement(tab, task)

        el.setAttribute('data-tab', tab.id)
        el.setAttribute('data-task', task.id)

        el.addEventListener('click', function (e) {
          switchToTask(this.getAttribute('data-task'))
          switchToTab(this.getAttribute('data-tab'))

          taskOverlay.hide()
        })

        var closeTabButton = this.closeButton(tabContainer, el)
        el.querySelector('.title').appendChild(closeTabButton)
        return el
      },

      container: function (task) {
        var tabContainer = document.createElement('div')
        tabContainer.className = 'task-tabs-container'

        if (task.tabs) {
          for (var i = 0; i < task.tabs.length; i++) {
            var el = this.element(tabContainer, task, task.tabs[i])
            tabContainer.appendChild(el)
          }
        }

        return tabContainer
      },

      closeButton: function (tabContainer, taskTabElement) {
        var closeTabButton = document.createElement('button')
        closeTabButton.innerHTML = '✕'
        closeTabButton.className = 'closeTab'

        closeTabButton.addEventListener('click', function (e) {
          closeTab(taskTabElement.getAttribute('data-tab'))
          tabContainer.removeChild(taskTabElement)

          // do not close taskOverlay
          // (the close button is part of the tab-element, so a click on it
          // would otherwise trigger opening this tab, and it was just closed)
          e.stopImmediatePropagation()
        })

        return closeTabButton
      }
    },

  },
  // extend with other helper functions?
};

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

    leaveTabEditMode()

    this.isShown = true
    taskSwitcherButton.classList.add('active')

    this.dragula.containers = []
    empty(taskContainer)

    // show the task elements
    tasks.get().forEach(function (task, index) {
      var el = TaskOverlayBuilder.create.task.container(task, index)

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
