const remoteMenu = require('remoteMenuRenderer.js')
const browserUI = require('browserUI.js')
const webviews = require('webviews.js')
const readerView = require('readerView.js')
const urlParser = require('util/urlParser.js')
const focusMode = require('../focusMode.js')

const tabContextMenu = {
  show: function (tabId) {
    const tabMenu = [[]]
		
		/**
		 * https://github.com/minbrowser/min/issues/2643
		 * 
		 * Users should not be able to duplicate tabs or open new windows in focus mode.
		 * Prior to this, users would be able to duplicate tabs without actually creating the view for them.
		 * So, as a consequence, when the tabMenuNewWindow context menu option was clicked,
		 * those duplicated tabs from before would all aggregate through the `viewManager.createView` logic.
		 * Then, all of the priorly duplicated tabs would suddenly appear.
		 */
		if (!focusMode.enabled()) {
			tabMenu[0].push({
				label: l('appMenuDuplicateTab'),
				click: function () {
					const sourceTab = tabs.get(tabId)
					// strip tab id so that a new one is generated
					const newTab = tabs.add({ ...sourceTab, id: undefined })

					browserUI.addTab(newTab, { enterEditMode: false })
				}
			})
			tabMenu[0].push({
				label: l('tabMenuNewWindow'),
				click: function () {
					// insert after current task
					let index
					if (tasks.getSelected()) {
						index = tasks.getIndex(tasks.getSelected().id) + 1
					}
					const newTask = tasks.get(tasks.add({}, index))

					const targetTab = tabs.get(tabId)
					tabs.destroy(targetTab.id)

					newTask.tabs.add(targetTab)

					ipc.send('newWindow', { initialTask: newTask.id })

					browserUI.switchToTask(tasks.getSelected().id)
				}
			})
		}

    if (tabs.get(tabId).url && (readerView.isReader(tabId) || !urlParser.isInternalURL(tabs.get(tabId).url))) {
      if (!readerView.isReader(tabId)) {
        tabMenu[0].push({
          label: l('enterReaderView'),
          click: function () {
            readerView.enter(tabId, tabs.get(tabId).url)
          }
        })
      } else {
        tabMenu[0].push({
          label: l('exitReaderView'),
          click: function () {
            readerView.exit(tabId)
          }
        })
      }
    }

    tabMenu[0].push( {
      label: l('tabMenuReload'),
      click: function () {
        if (tabs.get(tabId).url.startsWith(webviews.internalPages.error)) {
          // reload the original page rather than show the error page again
          webviews.update(tabId, new URL(tabs.get(tabId).url).searchParams.get('url'))
        } else {
          // this can't be an error page, use the normal reload method
          webviews.callAsync(tabId, 'reload')
        }
      }
    })

    remoteMenu.open(tabMenu)
  },
  initialize: function () {
    const container = document.getElementById('tabs-inner')
    container.addEventListener('contextmenu', function (e) {
      let node = e.target

      while (node) {
        if (node.classList.contains('tab-item')) {
          tabContextMenu.show(node.getAttribute('data-tab'))
          e.stopPropagation()
          break
        }
        node = node.parentNode
      }
    })
  }
}

module.exports = tabContextMenu
