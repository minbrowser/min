var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

function getTaskRelativeDate (task) {
  var startOfYesterday = new Date()
  startOfYesterday.setHours(0)
  startOfYesterday.setMinutes(0)
  startOfYesterday.setSeconds(0)
  startOfYesterday = startOfYesterday.getTime()
  startOfYesterday -= (24 * 60 * 60 * 1000)

  var time = tasks.getLastActivity(task.id)
  var d = new Date(time)

  // don't show times for recent tasks in order to save space
  if (time > startOfYesterday) {
    return null
  } else {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
  }
}

function getTaskContainer (id) {
  return document.querySelector('.task-container[data-task="{id}"]'.replace('{id}', id))
}

function removeTabFromOverlay (tabId, task) {
  task.tabs.destroy(tabId)
  webviews.destroy(tabId)

  tabBar.rerenderAll()

  // if there are no tabs left, remove the task
  if (task.tabs.count() === 0) {
    // remove the task element from the overlay
    getTaskContainer(task.id).remove()
    // close the task
    browserUI.closeTask(task.id)
  }
}

function taskIsCollapsed (task) {
  return task.collapsed || (task.collapsed === undefined && Date.now() - tasks.getLastActivity(task.id) > (7 * 24 * 60 * 60 * 1000))
}

function toggleCollapsed (taskContainer, task) {
  tasks.get(task.id).collapsed = !taskIsCollapsed(tasks.get(task.id))
  taskContainer.classList.toggle('collapsed')

  var collapseButton = taskContainer.querySelector('.task-collapse-button')
  collapseButton.classList.toggle('fa-angle-right')
  collapseButton.classList.toggle('fa-angle-down')
}

var TaskOverlayBuilder = {
  create: {
    task: {
      collapseButton: function (taskContainer, task) {
        var collapseButton = document.createElement('i')
        collapseButton.className = 'fa task-collapse-button'
        if (taskIsCollapsed(task)) {
          collapseButton.classList.add('fa-angle-right')
        } else {
          collapseButton.classList.add('fa-angle-down')
        }
        collapseButton.addEventListener('click', function (e) {
          e.stopPropagation()
          toggleCollapsed(taskContainer, task)
        })
        return collapseButton
      },
      nameInputField: function (task, taskIndex) {
        var input = document.createElement('input')
        input.classList.add('task-name')

        var taskName = l('defaultTaskName').replace('%n', taskIndex + 1)

        input.placeholder = taskName
        input.value = task.name || taskName

        input.addEventListener('keyup', function (e) {
          if (e.keyCode === 13) {
            this.blur()
          }

          task.name = this.value
        })

        input.addEventListener('focusin', function (e) {
          if (tasks.get(task.id).collapsed) {
            this.blur()
            return
          }
          this.select()
        })
        return input
      },
      deleteButton: function (container, task) {
        var deleteButton = document.createElement('i')
        deleteButton.className = 'fa fa-trash-o task-delete-button'

        deleteButton.addEventListener('click', function (e) {
          container.classList.add('deleting')
          setTimeout(function () {
            if (container.classList.contains('deleting')) {
              container.style.opacity = 0
              // transitionend would be nice here, but it doesn't work if the element is removed from the DOM
              setTimeout(function () {
                container.remove()
                browserUI.closeTask(task.id)
              }, 500)
            }
          }, 10000)
        })
        return deleteButton
      },
      deleteWarning: function (container, task) {
        var deleteWarning = document.createElement('div')
        deleteWarning.className = 'task-delete-warning'

        deleteWarning.innerHTML = 'Task deleted. <a> Undo?</a>'
        deleteWarning.addEventListener('click', function (e) {
          container.classList.remove('deleting')
        })
        return deleteWarning
      },

      actionContainer: function (taskContainer, task, taskIndex) {
        var taskActionContainer = document.createElement('div')
        taskActionContainer.className = 'task-action-container'

        // add the collapse button
        var collapseButton = this.collapseButton(taskContainer, task)
        taskActionContainer.appendChild(collapseButton)

        // add the input for the task name
        var input = this.nameInputField(task, taskIndex)
        taskActionContainer.appendChild(input)

        // add the delete button
        var deleteButton = this.deleteButton(taskContainer, task)
        taskActionContainer.appendChild(deleteButton)

        return taskActionContainer
      },
      dateContainer: function (task) {
        var dateContainer = document.createElement('div')
        dateContainer.className = 'task-date-container'

        var date = getTaskRelativeDate(task)

        if (date) {
          dateContainer.textContent = getTaskRelativeDate(task)
          return dateContainer
        }
      },
      container: function (task, taskIndex) {
        var container = document.createElement('div')
        container.className = 'task-container'

        if (task.id !== tasks.getSelected().id && taskIsCollapsed(task)) {
          container.classList.add('collapsed')
        }
        if (task.id === tasks.getSelected().id) {
          container.classList.add('selected')
        }
        container.setAttribute('data-task', task.id)

        container.addEventListener('click', function (e) {
          if (tasks.get(task.id).collapsed) {
            toggleCollapsed(container, task)
          }
        })

        var taskActionContainer = this.actionContainer(
          container,
          task,
          taskIndex
        )
        container.appendChild(taskActionContainer)

        var dateContainer = this.dateContainer(task)
        if (dateContainer) {
          container.appendChild(dateContainer)
        }

        var deleteWarning = this.deleteWarning(container, task)
        container.appendChild(deleteWarning)

        var tabContainer = TaskOverlayBuilder.create.tab.container(task)
        container.appendChild(tabContainer)

        return container
      }
    },

    tab: {
      element: function (tabContainer, task, tab) {
        var el = searchbarUtils.createItem({
          title: tab.title || l('newTabLabel'),
          secondaryText: urlParser.basicURL(urlParser.getSourceURL(tab.url)),
          classList: ['task-tab-item'],
          delete: function () {
            removeTabFromOverlay(tab.id, task)
          },
          showDeleteButton: true
        })

        el.tabIndex = 0
        el.setAttribute('data-tab', tab.id)

        // return or space should act like click
        el.addEventListener('keydown', function (e) {
          if (e.keyCode === 13 || e.keyCode === 32) {
            el.click()
          }
        })

        el.addEventListener('click', function (e) {
          browserUI.switchToTask(this.parentNode.getAttribute('data-task'))
          browserUI.switchToTab(this.getAttribute('data-tab'))

          taskOverlay.hide()
        })
        return el
      },

      container: function (task) {
        var tabContainer = document.createElement('div')
        tabContainer.className = 'task-tabs-container'
        tabContainer.setAttribute('data-task', task.id)

        if (task.tabs) {
          for (var i = 0; i < task.tabs.count(); i++) {
            var el = this.element(tabContainer, task, task.tabs.getAtIndex(i))
            tabContainer.appendChild(el)
          }
        }

        return tabContainer
      }
    }
  }
// extend with other helper functions?
}

module.exports = function createTaskContainer (task, index) {
  return TaskOverlayBuilder.create.task.container(task, index)
}
