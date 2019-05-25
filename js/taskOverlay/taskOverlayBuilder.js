var browserUI = require('browserUI.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

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

var TaskOverlayBuilder = {
  create: {
    task: {
      dragHandle: function () {
        var dragHandle = document.createElement('i')
        dragHandle.className = 'fa fa-arrows task-drag-handle'
        return dragHandle
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

        input.addEventListener('focus', function () {
          this.select()
        })
        return input
      },
      deleteButton: function (container, task) {
        var deleteButton = document.createElement('i')
        deleteButton.className = 'fa fa-trash-o'

        deleteButton.addEventListener('click', function (e) {
          container.remove()
          browserUI.closeTask(task.id)
        })
        return deleteButton
      },

      actionContainer: function (taskContainer, task, taskIndex) {
        var taskActionContainer = document.createElement('div')
        taskActionContainer.className = 'task-action-container'

        // add the drag handle
        var dragHandle = this.dragHandle()
        taskActionContainer.appendChild(dragHandle)

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

        var taskActionContainer = this.actionContainer(
          container,
          task,
          taskIndex
        )
        container.appendChild(taskActionContainer)

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
