const keybindings = require('keybindings.js')
var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var modalMode = require('modalMode.js')
var tabEditor = require('navbar/tabEditor.js')
var urlParser = require('util/urlParser.js')
var keyMapModule = require('util/keyMap.js')
var settings = require('util/settings/settings.js')

var keyMap = keyMapModule.userKeyMap(settings.get('keyMap'))

const defaultKeybindings = {
  initialize: function () {
    keybindings.defineShortcut('quitMin', function () {
      ipc.send('quit')
    })

    keybindings.defineShortcut('addTab', function () {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.addTab()
    })

    keybindings.defineShortcut('addPrivateTab', function () {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.addTab(tabs.add({
        private: true
      }))
    })

    keybindings.defineShortcut('duplicateTab', function () {
      if (modalMode.enabled()) {
        return
      }

      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      const sourceTab = tabs.get(tabs.getSelected())
      // strip tab id so that a new one is generated
      const newTab = tabs.add({ ...sourceTab, id: undefined })

      browserUI.addTab(newTab, { enterEditMode: false })
    })

    keybindings.defineShortcut('enterEditMode', function (e) {
      tabEditor.show(tabs.getSelected())
      return false
    })

    keybindings.defineShortcut('runShortcut', function (e) {
      tabEditor.show(tabs.getSelected(), '!')
    })

    keybindings.defineShortcut('closeTab', function (e) {
      browserUI.closeTab(tabs.getSelected())
    }, { contexts: ['default'] })

    keybindings.defineShortcut('moveTabLeft', function (e) {
      browserUI.moveTabLeft(tabs.getSelected())
    })

    keybindings.defineShortcut('moveTabRight', function (e) {
      browserUI.moveTabRight(tabs.getSelected())
    })

    keybindings.defineShortcut('restoreTab', function (e) {
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      var restoredTab = tasks.getSelected().tabHistory.pop()

      // The tab history stack is empty
      if (!restoredTab) {
        return
      }

      browserUI.addTab(tabs.add(restoredTab), {
        enterEditMode: false
      })
    })

    keybindings.defineShortcut('addToFavorites', function (e) {
      tabEditor.show(tabs.getSelected(), null, false) // we need to show the bookmarks button, which is only visible in edit mode
      tabEditor.container.querySelector('.bookmarks-button').click()
    })

    keybindings.defineShortcut('showBookmarks', function () {
      tabEditor.show(tabs.getSelected(), '!bookmarks ')
    })

    // cmd+x should switch to tab x. Cmd+9 should switch to the last tab

    for (var i = 1; i < 9; i++) {
      (function (i) {
        // cmd+1 switched to the next tab in versions <= 1.34. If it is set as a custom shortcut to match this behavior, don't register the default shortcut.
        if (i === 1 && (keyMap.switchToNextTab === 'mod+1' || (keyMap.switchToNextTab instanceof Array && keyMap.switchToNextTab.includes('mod+1')))) {
          return
        }

        keybindings.defineShortcut({ keys: 'mod+' + i }, function (e) {
          var newTab = tabs.getAtIndex(i - 1)
          if (newTab) {
            browserUI.switchToTab(newTab.id)
          }
        })
      })(i)
    }

    keybindings.defineShortcut('gotoLastTab', function (e) {
      browserUI.switchToTab(tabs.getAtIndex(tabs.count() - 1).id)
    })

    keybindings.defineShortcut('gotoFirstTab', function (e) {
      browserUI.switchToTab(tabs.getAtIndex(0).id)
    })

    keybindings.defineShortcut({ keys: 'esc' }, function (e) {
      if (webviews.placeholderRequests.length === 0 && document.activeElement.tagName !== 'INPUT') {
        webviews.callAsync(tabs.getSelected(), 'stop')
      }

      tabEditor.hide()

      if (modalMode.enabled() && modalMode.onDismiss) {
        modalMode.onDismiss()
        modalMode.onDismiss = null
      }

      // exit full screen mode
      webviews.callAsync(tabs.getSelected(), 'executeJavaScript', 'if(document.webkitIsFullScreen){document.webkitExitFullscreen()}')

      webviews.callAsync(tabs.getSelected(), 'focus')
    })

    keybindings.defineShortcut('goBack', function (d) {
      webviews.callAsync(tabs.getSelected(), 'goBack')
    })

    keybindings.defineShortcut('goForward', function (d) {
      webviews.callAsync(tabs.getSelected(), 'goForward')
    })

    keybindings.defineShortcut('switchToPreviousTab', function (d) {
      var currentIndex = tabs.getIndex(tabs.getSelected())
      var previousTab = tabs.getAtIndex(currentIndex - 1)

      if (previousTab) {
        browserUI.switchToTab(previousTab.id)
      } else {
        browserUI.switchToTab(tabs.getAtIndex(tabs.count() - 1).id)
      }
    })

    keybindings.defineShortcut('switchToNextTab', function (d) {
      var currentIndex = tabs.getIndex(tabs.getSelected())
      var nextTab = tabs.getAtIndex(currentIndex + 1)

      if (nextTab) {
        browserUI.switchToTab(nextTab.id)
      } else {
        browserUI.switchToTab(tabs.getAtIndex(0).id)
      }
    })

    keybindings.defineShortcut('switchToNextTask', function (d) {
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      const taskSwitchList = tasks.filter(t => !tasks.isCollapsed(t.id))

      const currentTaskIdx = taskSwitchList.findIndex(t => t.id === tasks.getSelected().id)

      const nextTask = taskSwitchList[currentTaskIdx + 1] || taskSwitchList[0]
      browserUI.switchToTask(nextTask.id)
    })

    keybindings.defineShortcut('switchToPreviousTask', function (d) {
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      const taskSwitchList = tasks.filter(t => !tasks.isCollapsed(t.id))

      const currentTaskIdx = taskSwitchList.findIndex(t => t.id === tasks.getSelected().id)
      taskCount = taskSwitchList.length

      const previousTask = taskSwitchList[currentTaskIdx - 1] || taskSwitchList[taskCount - 1]
      browserUI.switchToTask(previousTask.id)
    })

    // shift+option+cmd+x should switch to task x

    for (var i = 1; i < 10; i++) {
      (function (i) {
        keybindings.defineShortcut({ keys: 'shift+option+mod+' + i }, function (e) {
          if (focusMode.enabled()) {
            focusMode.warn()
            return
          }

          const taskSwitchList = tasks.filter(t => !tasks.isCollapsed(t.id))
          if (taskSwitchList[i - 1]) {
            browserUI.switchToTask(taskSwitchList[i - 1].id)
          }
        })
      })(i)
    }

    keybindings.defineShortcut('closeAllTabs', function (d) { // destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      var tset = tabs.get()
      for (var i = 0; i < tset.length; i++) {
        browserUI.destroyTab(tset[i].id)
      }

      browserUI.addTab() // create a new, blank tab
    })

    keybindings.defineShortcut('closeWindow', function() {
      ipc.invoke('close')
    })

    keybindings.defineShortcut('reload', function () {
      if (tabs.get(tabs.getSelected()).url.startsWith(webviews.internalPages.error)) {
        // reload the original page rather than show the error page again
        webviews.update(tabs.getSelected(), new URL(tabs.get(tabs.getSelected()).url).searchParams.get('url'))
      } else {
        // this can't be an error page, use the normal reload method
        webviews.callAsync(tabs.getSelected(), 'reload')
      }
    })

    keybindings.defineShortcut('reloadIgnoringCache', function () {
      webviews.callAsync(tabs.getSelected(), 'reloadIgnoringCache')
    })

    keybindings.defineShortcut('showHistory', function () {
      tabEditor.show(tabs.getSelected(), '!history ')
    })

    keybindings.defineShortcut('copyPageURL', function () {
      const tab = tabs.get(tabs.getSelected())
      const url = urlParser.getSourceURL(tab.url)
      if (url) {
        const anchorTag = document.createElement('a')
        anchorTag.href = url
        anchorTag.textContent = url

        electron.clipboard.write({
          text: url,
          bookmark: tab.title,
          html: anchorTag.outerHTML
        })
      }
    })
  }
}

module.exports = defaultKeybindings
