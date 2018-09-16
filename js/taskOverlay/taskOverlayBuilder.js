var browserUI = require('api-wrapper.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

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

        var taskName = l('defaultTaskName').replace('%n', (taskIndex + 1))

        input.placeholder = taskName
        input.value = task.name || taskName

        input.addEventListener('keyup', function (e) {
          if (e.keyCode === 13) {
            this.blur()
          }
          tasks.update(task.id, { name: this.value })
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

        var taskActionContainer = this.actionContainer(container, task, taskIndex)
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
          secondaryText: urlParser.basicURL(tab.url),
          classList: ['task-tab-item'],
          delete: function () {
            removeTabFromOverlay(tab.id, task)
          }
        })

        el.setAttribute('data-tab', tab.id)

        el.addEventListener('click', function (e) {
          browserUI.switchToTask(this.parentNode.getAttribute('data-task'))
          browserUI.switchToTab(this.getAttribute('data-tab'))

          taskOverlay.hide()
        })

        var closeTabButton = this.closeButton(el)
        el.querySelector('.title').appendChild(closeTabButton)
        return el
      },

      container: function (task) {
        var tabContainer = document.createElement('div')
        tabContainer.className = 'task-tabs-container'
        tabContainer.setAttribute('data-task', task.id)

        if (task.tabs) {
          for (var i = 0; i < task.tabs.length; i++) {
            var el = this.element(tabContainer, task, task.tabs[i])
            tabContainer.appendChild(el)
          }
        }

        return tabContainer
      },

      closeButton: function (taskTabElement) {
        var closeTabButton = document.createElement('button')
        closeTabButton.className = 'closeTab fa fa-close'

        closeTabButton.addEventListener('click', function (e) {
          var tabId = taskTabElement.getAttribute('data-tab')
          var taskId = taskTabElement.parentNode.getAttribute('data-task')

          removeTabFromOverlay(tabId, tasks.get(taskId))
          taskTabElement.parentNode.removeChild(taskTabElement)

          // do not close taskOverlay
          // (the close button is part of the tab-element, so a click on it
          // would otherwise trigger opening this tab, and it was just closed)
          e.stopImmediatePropagation()
        })

        return closeTabButton
      }
    }

  }
// extend with other helper functions?
}

module.exports = function createTaskContainer(task, index) {
  return TaskOverlayBuilder.create.task.container(task, index)
}
