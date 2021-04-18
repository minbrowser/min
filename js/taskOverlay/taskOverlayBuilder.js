var browserUI = require('browserUI.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')
var searchEngine = require('util/searchEngine.js')

const faviconMinimumLuminance = 70 // minimum brightness for a "light" favicon

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
    return new Intl.DateTimeFormat(navigator.language, { month: 'long', day: 'numeric', year: 'numeric' }).format(d)
  }
}

function toggleCollapsed (taskContainer, task) {
  tasks.get(task.id).collapsed = !tasks.isCollapsed(task.id)
  taskContainer.classList.toggle('collapsed')

  var collapseButton = taskContainer.querySelector('.task-collapse-button')
  collapseButton.classList.toggle('carbon:chevron-right')
  collapseButton.classList.toggle('carbon:chevron-down')

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
        collapseButton.className = 'task-collapse-button i'
        collapseButton.setAttribute('tabindex', '-1')

        collapseButton.setAttribute('aria-haspopup', 'true')
        if (tasks.isCollapsed(task.id)) {
          collapseButton.classList.add('carbon:chevron-right')
          collapseButton.setAttribute('aria-expanded', 'false')
        } else {
          collapseButton.classList.add('carbon:chevron-down')
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
        input.classList.add('mousetrap')

        var taskName = l('defaultTaskName').replace('%n', taskIndex + 1)

        input.placeholder = taskName
        input.value = task.name || taskName
        input.spellcheck = false

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
        deleteButton.className = 'task-delete-button i carbon:trash-can'
        deleteButton.tabIndex = -1 // needed for keyboardNavigationHelper

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

        var favicons = []
        var faviconURLs = []

        task.tabs.get().sort((a, b) => b.lastActivity - a.lastActivity).forEach(function (tab) {
          if (tab.favicon) {
            favicons.push(tab.favicon)
            faviconURLs.push(tab.favicon.url)
          }
        })

        if (favicons.length > 0) {
          var faviconsEl = document.createElement('span')
          faviconsEl.className = 'task-favicons'
          favicons = favicons.filter((i, idx) => faviconURLs.indexOf(i.url) === idx)

          favicons.forEach(function (favicon) {
            var img = document.createElement('img')
            img.src = favicon.url
            if (favicon.luminance < faviconMinimumLuminance) {
              img.classList.add('dark-favicon')
            }
            faviconsEl.appendChild(img)
          })

          infoContainer.appendChild(faviconsEl)
        }

        return infoContainer
      },
      container: function (task, taskIndex, events) {
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

        var tabContainer = TaskOverlayBuilder.create.tab.container(task, events)
        container.appendChild(tabContainer)

        return container
      }
    },

    tab: {
      element: function (tabContainer, task, tab, events) {
        var data = {
          classList: ['task-tab-item'],
          delete: events.tabDelete,
          showDeleteButton: true
        }

        if (tab.private) {
          data.icon = 'carbon:view-off'
        } else if (tab.favicon) {
          data.iconImage = tab.favicon.url

          if (tab.favicon.luminance && tab.favicon.luminance < faviconMinimumLuminance) {
            data.classList.push('has-dark-favicon')
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

        el.setAttribute('data-tab', tab.id)

        el.addEventListener('click', events.tabSelect)
        return el
      },

      container: function (task, events) {
        var tabContainer = document.createElement('ul')
        tabContainer.className = 'task-tabs-container'
        tabContainer.setAttribute('data-task', task.id)

        if (task.tabs) {
          for (var i = 0; i < task.tabs.count(); i++) {
            var el = this.element(tabContainer, task, task.tabs.getAtIndex(i), events)
            tabContainer.appendChild(el)
          }
        }

        return tabContainer
      }
    }
  }
// extend with other helper functions?
}

module.exports = function createTaskContainer (task, index, events) {
  return TaskOverlayBuilder.create.task.container(task, index, events)
}
