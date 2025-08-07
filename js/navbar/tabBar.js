const EventEmitter = require('events')

const webviews = require('webviews.js')
const focusMode = require('focusMode.js')
const readerView = require('readerView.js')
const tabAudio = require('tabAudio.js')
const dragula = require('dragula')
const settings = require('util/settings/settings.js')
const urlParser = require('util/urlParser.js')

const tabEditor = require('navbar/tabEditor.js')
const progressBar = require('navbar/progressBar.js')
const permissionRequests = require('navbar/permissionRequests.js')

var lastTabDeletion = 0 // TODO get rid of this

const tabBar = {
  navBar: document.getElementById('navbar'),
  container: document.getElementById('tabs'),
  containerInner: document.getElementById('tabs-inner'),
  tabElementMap: {}, // tabId: tab element
  events: new EventEmitter(),
  dragulaInstance: null,
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
      activeTab.removeAttribute('aria-selected')
    }

    var el = tabBar.getTab(tabId)
    el.classList.add('active')
    el.setAttribute('aria-selected', 'true')

    requestAnimationFrame(function () {
      el.scrollIntoView()
    })
  },
  createTab: function (data) {
    var tabEl = document.createElement('div')
    tabEl.className = 'tab-item'
    tabEl.setAttribute('data-tab', data.id)
    tabEl.setAttribute('role', 'tab')

    tabEl.appendChild(readerView.getButton(data.id))
    tabEl.appendChild(tabAudio.getButton(data.id))
    tabEl.appendChild(progressBar.create())
    if (data.favicon) {
      var favicon = document.createElement('img')
      favicon.className = 'favicon'
      if (data.favicon) {
        favicon.src = data.favicon.url
      } else {
        favicon.src = data.favicon.url
      }
      tabEl.appendChild(favicon)
    }

    // icons

    var iconArea = document.createElement('span')
    iconArea.className = 'tab-icon-area'

    if (data.private) {
      var pbIcon = document.createElement('i')
      pbIcon.className = 'icon-tab-is-private tab-icon tab-info-icon i carbon:view-off'
      iconArea.appendChild(pbIcon)
    }

    var closeTabButton = document.createElement('button')
    closeTabButton.className = 'tab-icon tab-close-button i carbon:close'

    closeTabButton.addEventListener('click', function (e) {
      tabBar.events.emit('tab-closed', data.id)
      // prevent the searchbar from being opened
      e.stopPropagation()
    })

    iconArea.appendChild(closeTabButton)

    tabEl.appendChild(iconArea)

    // title

    var titleContainer = document.createElement('div')
    titleContainer.className = 'title-container'

    var title = document.createElement('span')
    title.className = 'title'

    // URL

    var urlElement = document.createElement('span')
    urlElement.className = 'url-element'

    titleContainer.appendChild(title)
    titleContainer.appendChild(urlElement)

    tabEl.appendChild(titleContainer)

    // click to enter edit mode or switch to a tab
    tabEl.addEventListener('click', function (e) {
      if (tabs.getSelected() !== data.id) { // else switch to tab if it isn't focused
        tabBar.events.emit('tab-selected', data.id)
      } else { // the tab is focused, edit tab instead
        tabEditor.show(data.id)
      }
    })

    tabEl.addEventListener('auxclick', function (e) {
      if (e.which === 2) { // if mouse middle click -> close tab
        tabBar.events.emit('tab-closed', data.id)
      }
    })

    tabEl.addEventListener('wheel', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // https://github.com/minbrowser/min/issues/698
        return
      }
      if (e.deltaY > 65 && e.deltaX < 10 && Date.now() - lastTabDeletion > 900) { // swipe up to delete tabs
        lastTabDeletion = Date.now()

        /* tab deletion is disabled in focus mode */
        if (focusMode.enabled()) {
          focusMode.warn()
          return
        }

        this.style.transform = 'translateY(-100%)'

        setTimeout(function () {
          tabBar.events.emit('tab-closed', data.id)
        }, 150) // wait until the animation has completed
      }
    })

    tabBar.updateTab(data.id, tabEl)

    return tabEl
  },
  updateTab: function (tabId, tabEl = tabBar.getTab(tabId)) {
    var tabData = tabs.get(tabId)

    // update tab title
    var tabTitle

    const isNewTab = tabData.url === '' || tabData.url === urlParser.parse('min://newtab')
    if (isNewTab) {
      tabTitle = l('newTabLabel')
    } else if (tabData.title) {
      tabTitle = tabData.title
    } else if (tabData.loaded) {
      tabTitle = tabData.url
    }

    tabTitle = (tabTitle || l('newTabLabel')).substring(0, 500)

    var titleEl = tabEl.querySelector('.title')
    titleEl.textContent = tabTitle

    tabEl.title = tabTitle
    if (tabData.private) {
      tabEl.title += ' (' + l('privateTab') + ')'
    }

    var tabUrl = urlParser.getDomain(tabData.url)
    if (tabUrl.startsWith('www.') && tabUrl.split('.').length > 2) {
      tabUrl = tabUrl.replace('www.', '')
    }

    tabEl.querySelector('.url-element').textContent = tabUrl

    if (tabUrl && !urlParser.isInternalURL(tabData.url)) {
      tabEl.classList.add('has-url')
    } else {
      tabEl.classList.remove('has-url')
    }

    // update tab audio icon
    var audioButton = tabEl.querySelector('.tab-audio-button')
    tabAudio.updateButton(tabId, audioButton)

    if (tabData.favicon) {
      // 2 scenarios, either favicon was already loaded or it was not loaded
      var favicon = tabEl.getElementsByClassName('favicon')[0]
      if (favicon) {
        favicon.src = tabData.favicon.url
      } else {
        var favicon = document.createElement('img')
        favicon.className = 'favicon'
        favicon.src = tabData.favicon.url
        audioButton.before(favicon)
      }
    }

    tabEl.querySelectorAll('.permission-request-icon').forEach(el => el.remove())

    permissionRequests.getButtons(tabId).reverse().forEach(function (button) {
      tabEl.insertBefore(button, tabEl.children[0])
    })

    var iconArea = tabEl.getElementsByClassName('tab-icon-area')[0]

    var insecureIcon = tabEl.getElementsByClassName('icon-tab-not-secure')[0]
    if (tabData.secure === true && insecureIcon) {
      insecureIcon.remove()
    } else if (tabData.secure === false && !insecureIcon) {
      var insecureIcon = document.createElement('i')
      insecureIcon.className = 'icon-tab-not-secure tab-icon tab-info-icon i carbon:unlocked'
      insecureIcon.title = l('connectionNotSecure')
      iconArea.appendChild(insecureIcon)
    }
  },
  updateAll: function () {
    empty(tabBar.containerInner)
    tabBar.tabElementMap = {}

    tabs.get().forEach(function (tab) {
      var el = tabBar.createTab(tab)
      tabBar.containerInner.appendChild(el)
      tabBar.tabElementMap[tab.id] = el
    })

    if (tabs.getSelected()) {
      tabBar.setActiveTab(tabs.getSelected())
    }
    tabBar.handleSizeChange()
  },
  addTab: function (tabId) {
    var tab = tabs.get(tabId)
    var index = tabs.getIndex(tabId)

    var tabEl = tabBar.createTab(tab)
    tabBar.containerInner.insertBefore(tabEl, tabBar.containerInner.childNodes[index])
    tabBar.tabElementMap[tabId] = tabEl
    tabBar.handleSizeChange()
  },
  removeTab: function (tabId) {
    var tabEl = tabBar.getTab(tabId)
    if (tabEl) {
      // The tab does not have a corresponding .tab-item element.
      // This happens when destroying tabs from other task where this .tab-item is not present
      tabBar.containerInner.removeChild(tabEl)
      delete tabBar.tabElementMap[tabId]
      tabBar.handleSizeChange()
    }
  },
  handleDividerPreference: function (dividerPreference) {
    if (dividerPreference === true) {
      tabBar.navBar.classList.add('show-dividers')
    } else {
      tabBar.navBar.classList.remove('show-dividers')
    }
  },
  handleFaviconPreference: function (faviconPreference) {
    console.log('faviconPreference', faviconPreference) 
    if (faviconPreference === true) {
      tabBar.navBar.classList.add('show-favicons')
    } else {
      tabBar.navBar.classList.remove('show-favicons')
    }
  },
  initializeTabDragging: function () {
    tabBar.dragulaInstance = dragula([document.getElementById('tabs-inner')], {
      direction: 'horizontal',
      slideFactorX: 25
    })

    tabBar.dragulaInstance.on('drop', function (el, target, source, sibling) {
      var tabId = el.getAttribute('data-tab')
      if (sibling) {
        var adjacentTabId = sibling.getAttribute('data-tab')
      }

      var oldTab = tabs.splice(tabs.getIndex(tabId), 1)[0]

      var newIdx
      if (adjacentTabId) {
        newIdx = tabs.getIndex(adjacentTabId)
      } else {
        // tab was inserted at end
        newIdx = tabs.count()
      }

      tabs.splice(newIdx, 0, oldTab)
    })
  },
  handleSizeChange: function () {
    if (window.innerWidth / tabBar.containerInner.childNodes.length < 190) {
      tabBar.container.classList.add('compact-tabs')
    } else {
      tabBar.container.classList.remove('compact-tabs')
    }
  }
}

window.addEventListener('resize', tabBar.handleSizeChange)

settings.listen('showDividerBetweenTabs', function (dividerPreference) {
  tabBar.handleDividerPreference(dividerPreference)
})

settings.listen('showFaviconInTabs', function (showFaviconTabPreference) {
  tabBar.handleFaviconPreference(showFaviconTabPreference)
})

/* tab loading and progress bar status */
webviews.bindEvent('did-start-loading', function (tabId) {
  progressBar.update(tabBar.getTab(tabId).querySelector('.progress-bar'), 'start')
  tabs.update(tabId, { loaded: false })
})

webviews.bindEvent('did-stop-loading', function (tabId) {
  progressBar.update(tabBar.getTab(tabId).querySelector('.progress-bar'), 'finish')
  tabs.update(tabId, { loaded: true })
  tabBar.updateTab(tabId)
})

tasks.on('tab-updated', function (id, key) {
  var updateKeys = ['title', 'secure', 'url', 'muted', 'hasAudio', 'favicon']
  if (updateKeys.includes(key)) {
    tabBar.updateTab(id)
  }
})

permissionRequests.onChange(function (tabId) {
  if (tabs.get(tabId)) {
    tabBar.updateTab(tabId)
  }
})

tabBar.initializeTabDragging()

tabBar.container.addEventListener('dragover', e => e.preventDefault())

tabBar.container.addEventListener('drop', e => {
  e.preventDefault()
  var data = e.dataTransfer
  var path = data.files[0] ? 'file://' + electron.webUtils.getPathForFile(data.files[0]) : data.getData('text')
  if (!path) {
    return
  }
  if (tabEditor.isShown || tabs.isEmpty()) {
    webviews.update(tabs.getSelected(), path)
    tabEditor.hide()
  } else {
    require('browserUI.js').addTab(tabs.add({
      url: path,
      private: tabs.get(tabs.getSelected()).private
    }), { enterEditMode: false, openInBackground: !settings.get('openTabsInForeground') })
  }
})

module.exports = tabBar
