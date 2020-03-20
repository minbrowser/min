var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var urlParser = require('util/urlParser.js')

var tabEditor = require('navbar/tabEditor.js')
var progressBar = require('navbar/progressBar.js')
var permissionRequests = require('navbar/permissionRequests.js')

var lastTabDeletion = 0 // TODO get rid of this

window.tabBar = {
  container: document.getElementById('tabs'),
  containerInner: document.getElementById('tabs-inner'),
  tabElementMap: {}, // tabId: tab element
  getTab: function (tabId) {
    return tabBar.tabElementMap[tabId]
  },
  getTabInput: function (tabId) {
    return tabBar.getTab(tabId).querySelector('.tab-input')
  },
  setActiveTab: function (tabId) {
    var activeTab = document.querySelector('.tab-item.active')

    if (activeTab) {
      activeTab.classList.remove('active')
    }

    var el = tabBar.getTab(tabId)
    el.classList.add('active')

    requestAnimationFrame(function () {
      el.scrollIntoView()
    })
  },
  rerenderTab: function (tabId) {
    var tabData = tabs.get(tabId)

    var tabEl = tabBar.getTab(tabId)
    var viewContents = tabEl.querySelector('.tab-view-contents')

    var tabTitle = tabData.title || l('newTabLabel')
    var titleEl = viewContents.querySelector('.title')
    titleEl.textContent = tabTitle

    tabEl.title = tabTitle
    if (tabData.private) {
      tabEl.title += ' (' + l('privateTab') + ')'
    }

    viewContents.querySelectorAll('.permission-request-icon').forEach(el => el.remove())

    permissionRequests.getButtons(tabId).reverse().forEach(function (button) {
      viewContents.insertBefore(button, viewContents.children[0])
    })

    var secIcon = viewContents.getElementsByClassName('icon-tab-not-secure')[0]
    if (tabData.secure === false) {
      secIcon.hidden = false
    } else {
      secIcon.hidden = true
    }
  },
  rerenderAll: function () {
    empty(tabBar.containerInner)
    tabBar.tabElementMap = {}

    tabs.get().forEach(function (tab) {
      var el = tabBar.createElement(tab)
      tabBar.containerInner.appendChild(el)
      tabBar.tabElementMap[tab.id] = el
    })

    if (tabs.getSelected()) {
      tabBar.setActiveTab(tabs.getSelected())
    }
  },
  createElement: function (data) {
    var url = urlParser.parse(data.url)
    var tabTitle = data.title || l('newTabLabel')

    var tabEl = document.createElement('div')
    tabEl.className = 'tab-item'
    tabEl.setAttribute('data-tab', data.id)

    tabEl.title = tabTitle
    if (data.private) {
      tabEl.title += ' (' + l('privateTab') + ')'
    }

    var viewContents = document.createElement('div')
    viewContents.className = 'tab-view-contents'

    permissionRequests.getButtons(data.id).forEach(function (button) {
      viewContents.appendChild(button)
    })

    viewContents.appendChild(readerView.getButton(data.id))
    viewContents.appendChild(progressBar.create())

    // icons

    var iconArea = document.createElement('span')
    iconArea.className = 'tab-icon-area'

    var closeTabButton = document.createElement('i')
    closeTabButton.classList.add('tab-icon')
    closeTabButton.classList.add('tab-close-button')
    closeTabButton.classList.add('fa')
    closeTabButton.classList.add('fa-times-circle')

    closeTabButton.addEventListener('click', function (e) {
      browserUI.closeTab(data.id)
      // prevent the searchbar from being opened
      e.stopPropagation()
    })

    iconArea.appendChild(closeTabButton)

    if (data.private) {
      var pbIcon = document.createElement('i')
      pbIcon.className = 'fa fa-eye-slash icon-tab-is-private tab-icon tab-info-icon'
      iconArea.appendChild(pbIcon)
    }

    var secIcon = document.createElement('i')
    secIcon.className = 'fa fa-unlock icon-tab-not-secure tab-icon tab-info-icon'
    secIcon.title = l('connectionNotSecure')

    secIcon.hidden = data.secure !== false
    iconArea.appendChild(secIcon)

    viewContents.appendChild(iconArea)

    // title

    var title = document.createElement('span')
    title.className = 'title'
    title.textContent = tabTitle

    viewContents.appendChild(title)

    tabEl.appendChild(viewContents)

    // click to enter edit mode or switch to a tab
    viewContents.addEventListener('click', function (e) {
      if (tabs.getSelected() !== data.id) { // else switch to tab if it isn't focused
        browserUI.switchToTab(data.id)
      } else { // the tab is focused, edit tab instead
        tabEditor.show(data.id)
      }
    })

    tabEl.addEventListener('auxclick', function (e) {
      if (e.which === 2) { // if mouse middle click -> close tab
        browserUI.closeTab(data.id)
      }
    })

    tabEl.addEventListener('wheel', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // https://github.com/minbrowser/min/issues/698
        return
      }
      if (e.deltaY > 65 && e.deltaX < 10 && Date.now() - lastTabDeletion > 650) { // swipe up to delete tabs
        lastTabDeletion = Date.now()

        /* tab deletion is disabled in focus mode */
        if (focusMode.enabled()) {
          focusMode.warn()
          return
        }

        var tab = this.getAttribute('data-tab')
        this.style.transform = 'translateY(-100%)'

        setTimeout(function () {
          browserUI.closeTab(tab)
        }, 150) // wait until the animation has completed
      }
    })

    return tabEl
  },
  addTab: function (tabId) {
    var tab = tabs.get(tabId)
    var index = tabs.getIndex(tabId)

    var tabEl = tabBar.createElement(tab)
    tabBar.containerInner.insertBefore(tabEl, tabBar.containerInner.childNodes[index])
    tabBar.tabElementMap[tabId] = tabEl
  },
  removeTab: function (tabId) {
    var tabEl = tabBar.getTab(tabId)
    if (tabEl) {
      // The tab does not have a corresponding .tab-item element.
      // This happens when destroying tabs from other task where this .tab-item is not present
      tabBar.containerInner.removeChild(tabEl)
      delete tabBar.tabElementMap[tabId]
    }
  }
}

/* progress bar events */

webviews.bindEvent('did-start-loading', function (webview, tabId, e) {
  progressBar.update(tabBar.getTab(tabId).querySelector('.progress-bar'), 'start')
})

webviews.bindEvent('did-stop-loading', function (webview, tabId, e) {
  progressBar.update(tabBar.getTab(tabId).querySelector('.progress-bar'), 'finish')
})

tasks.on('tab-updated', function (id, key) {
  if (key === 'title' || key === 'secure' || key === 'url') {
    tabBar.rerenderTab(id)
  }
})

permissionRequests.onChange(function (tabId) {
  tabBar.rerenderTab(tabId)
})
