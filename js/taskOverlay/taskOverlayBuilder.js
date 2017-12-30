function removeTabFromOverlay (tabId, task) {
  task.tabs.destroy(tabId)
  destroyWebview(tabId)

  rerenderTabstrip()

  // if there are no tabs left, remove the task
  if (task.tabs.count() === 0) {
    destroyTask(task.id)
    if (tasks.get().length === 0) {
      addTask()
    } else {
      // re-render the overlay to remove the task element
      getTaskContainer(task.id).remove()
    }
  }
}

var TaskOverlayBuilder = {
  create: {
    task: {
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
            addTask()
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
      }
    },

    tab: {
      element: function (tabContainer, task, tab) {
        var el = createSearchbarItem({
          title: tab.title || l('newTabLabel'),
          secondaryText: urlParser.removeProtocol(tab.url),
          classList: ['task-tab-item'],
          delete: function () {
            removeTabFromOverlay(tab.id, task)
          }
        })

        el.setAttribute('data-tab', tab.id)
        el.setAttribute('data-task', task.id)

        el.addEventListener('click', function (e) {
          switchToTask(this.getAttribute('data-task'))
          switchToTab(this.getAttribute('data-tab'))

          taskOverlay.hide()
        })

        var closeTabButton = this.closeButton(el)
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

      closeButton: function (taskTabElement) {
        var closeTabButton = document.createElement('button')
        closeTabButton.className = 'closeTab'

        var closeTabIcon = document.createElement('i')
        closeTabIcon.className = 'fa fa-close'
        closeTabButton.appendChild(closeTabIcon)

        closeTabButton.addEventListener('click', function (e) {
          var tabId = taskTabElement.getAttribute('data-tab')
          var taskId = taskTabElement.getAttribute('data-task')

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

window.task_container_build_func = TaskOverlayBuilder.create.task.container.bind(TaskOverlayBuilder.create.task)

