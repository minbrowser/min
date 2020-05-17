var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')
var searchEngine = require('util/searchEngine.js')
var tabBar = require('navbar/tabBar.js')

function getTaskRelativeDate (task) {
  var minimumTime = new Date()
  minimumTime.setHours(0)
  minimumTime.setMinutes(0)
  minimumTime.setSeconds(0)
  minimumTime = minimumTime.getTime()
  minimumTime -= (5 * 24 * 60 * 60 * 1000)

  var time = tasks.getLastActivity(task.id)
  var d = new Date(time)

  // don't show times for recent tasks in order to save space
  if (time > minimumTime) {
    return null
  } else {
    return new Intl.DateTimeFormat(navigator.language, {month: 'long', day: 'numeric', year: 'numeric'}).format(d)
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

function toggleCollapsed (taskContainer, task) {
  tasks.get(task.id).collapsed = !tasks.isCollapsed(task.id)
  taskContainer.classList.toggle('collapsed')

  var collapseButton = taskContainer.querySelector('.task-collapse-button')
  collapseButton.classList.toggle('fa-angle-right')
  collapseButton.classList.toggle('fa-angle-down')
  if (tasks.isCollapsed(task.id)) {
    collapseButton.setAttribute('aria-expanded', 'false')
  } else {
    collapseButton.setAttribute('aria-expanded', 'true')
  }
}

var TaskOverlayBuilder = {
  create: {
    task: {
      collapseButton: function (taskContainer, task) {
        var collapseButton = document.createElement('button')
        collapseButton.className = 'fa task-collapse-button'
        collapseButton.setAttribute('aria-haspopup', 'true')
        if (tasks.isCollapsed(task.id)) {
          collapseButton.classList.add('fa-angle-right')
          collapseButton.setAttribute('aria-expanded', 'false')
        } else {
          collapseButton.classList.add('fa-angle-down')
          collapseButton.setAttribute('aria-expanded', 'true')
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
          if (tasks.isCollapsed(task.id)) {
            this.blur()
            return
          }
          this.select()
        })
        return input
      },
      deleteButton: function (container, task) {
        var deleteButton = document.createElement('button')
        deleteButton.className = 'fa fa-trash-o task-delete-button'

        deleteButton.addEventListener('click', function (e) {
          if (task.tabs.isEmpty()) {
            container.remove()
            browserUI.closeTask(task.id)
          } else {
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
          }
        })
        return deleteButton
      },
      deleteWarning: function (container, task) {
        var deleteWarning = document.createElement('div')
        deleteWarning.className = 'task-delete-warning'

        deleteWarning.innerHTML = l('taskDeleteWarning').unsafeHTML
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
      infoContainer: function (task) {
        var infoContainer = document.createElement('div')
        infoContainer.className = 'task-info-container'

        var date = getTaskRelativeDate(task)

        if (date) {
          var dateEl = document.createElement('span')
          dateEl.className = 'task-date'
          dateEl.textContent = date
          infoContainer.appendChild(dateEl)
        }

        var lastTabEl = document.createElement('span')
        lastTabEl.className = 'task-last-tab-title'
        var lastTabTitle = task.tabs.get().sort((a, b) => b.lastActivity - a.lastActivity)[0].title

        if (lastTabTitle) {
          lastTabTitle = searchbarUtils.getRealTitle(lastTabTitle)
          if (lastTabTitle.length > 40) {
            lastTabTitle = lastTabTitle.substring(0, 40) + '...'
          }
          lastTabEl.textContent = searchbarUtils.getRealTitle(lastTabTitle)
        }
        infoContainer.appendChild(lastTabEl)

        return infoContainer
      },
      container: function (task, taskIndex) {
        var container = document.createElement('div')
        container.className = 'task-container'

        if (task.id !== tasks.getSelected().id && tasks.isCollapsed(task.id)) {
          container.classList.add('collapsed')
        }
        if (task.id === tasks.getSelected().id) {
          container.classList.add('selected')
        }
        container.setAttribute('data-task', task.id)

        container.addEventListener('click', function (e) {
          if (tasks.isCollapsed(task.id)) {
            toggleCollapsed(container, task)
          }
        })

        var taskActionContainer = this.actionContainer(
          container,
          task,
          taskIndex
        )
        container.appendChild(taskActionContainer)

        var infoContainer = this.infoContainer(task)
        container.appendChild(infoContainer)

        var deleteWarning = this.deleteWarning(container, task)
        container.appendChild(deleteWarning)

        var tabContainer = TaskOverlayBuilder.create.tab.container(task)
        container.appendChild(tabContainer)

        return container
      }
    },

    tab: {
      element: function (tabContainer, task, tab) {
        var data = {
          classList: ['task-tab-item'],
          delete: function () {
            removeTabFromOverlay(tab.id, task)
          },
          showDeleteButton: true
        }

        if (tab.private) {
          data.icon = 'fa-eye-slash'
        } else if (tab.favicon) {
          data.iconImage = tab.favicon.url

          if (tab.favicon.luminance && tab.favicon.luminance < 70) {
            data.classList.push('dark-favicon')
          }
        }

        var source = urlParser.getSourceURL(tab.url)
        var searchQuery = searchEngine.getSearch(source)

        if (searchQuery) {
          data.title = searchQuery.search
          data.secondaryText = searchQuery.engine
        } else {
          data.title = tab.title || l('newTabLabel')
          data.secondaryText = urlParser.basicURL(source)
        }

        var el = searchbarUtils.createItem(data)

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
        var tabContainer = document.createElement('ul')
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
