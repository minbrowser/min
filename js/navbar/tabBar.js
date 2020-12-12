const webviews = require('webviews.js')
const focusMode = require('focusMode.js')
const readerView = require('readerView.js')
const tabAudio = require('tabAudio.js')
const dragula = require('dragula')
const settings = require('util/settings/settings.js')

const tabEditor = require('navbar/tabEditor.js')
const progressBar = require('navbar/progressBar.js')
const permissionRequests = require('navbar/permissionRequests.js')

let lastTabDeletion = 0 // TODO get rid of this

const tabBar = {
  navBar: document.getElementById('navbar'),
  container: document.getElementById('tabs'),
  containerInner: document.getElementById('tabs-inner'),
  tabElementMap: {}, // tabId: tab element
  events: new EventEmitter(),
  dragulaInstance: dragula([document.getElementById('tabs-inner')], {
    direction: 'horizontal'
  }),
  getTab: function (tabId) {
    return tabBar.tabElementMap[tabId]
  },
  getTabInput: function (tabId) {
    return tabBar.getTab(tabId).querySelector('.tab-input')
  },
  setActiveTab: function (tabId) {
    const activeTab = document.querySelector('.tab-item.active')

    if (activeTab) {
      activeTab.classList.remove('active')
      activeTab.removeAttribute('aria-selected')
    }

    const el = tabBar.getTab(tabId)
    el.classList.add('active')
    el.setAttribute('aria-selected', 'true')

    requestAnimationFrame(function () {
      el.scrollIntoView()
    })
  },
  createTab: function (data) {
    const tabEl = document.createElement('div')
    tabEl.className = 'tab-item'
    tabEl.setAttribute('data-tab', data.id)
    tabEl.setAttribute('role', 'tab')

    tabEl.appendChild(readerView.getButton(data.id))
    tabEl.appendChild(tabAudio.getButton(data.id))
    tabEl.appendChild(progressBar.create())

    // icons

    const iconArea = document.createElement('span')
    iconArea.className = 'tab-icon-area'

    if (data.private) {
      const pbIcon = document.createElement('i')
      pbIcon.className = 'icon-tab-is-private tab-icon tab-info-icon i carbon:view-off'
      iconArea.appendChild(pbIcon)
    }

    const secIcon = document.createElement('i')
    secIcon.className = 'icon-tab-not-secure tab-icon tab-info-icon i carbon:unlocked'
    secIcon.title = l('connectionNotSecure')
    iconArea.appendChild(secIcon)

    const closeTabButton = document.createElement('button')
    closeTabButton.className = 'tab-icon tab-close-button i carbon:close'

    closeTabButton.addEventListener('click', function (e) {
      tabBar.events.emit('tab-closed', data.id)
      // prevent the searchbar from being opened
      e.stopPropagation()
    })

    iconArea.appendChild(closeTabButton)

    tabEl.appendChild(iconArea)

    // title

    const title = document.createElement('span')
    title.className = 'title'

    tabEl.appendChild(title)

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
    const tabData = tabs.get(tabId)

    const tabTitle = (tabData.title || l('newTabLabel')).substring(0, 500)
    const titleEl = tabEl.querySelector('.title')
    titleEl.textContent = tabTitle

    tabEl.title = tabTitle
    if (tabData.private) {
      tabEl.title += ' (' + l('privateTab') + ')'
    }

    // update tab audio icon
    const audioButton = tabEl.querySelector('.tab-audio-button')
    tabAudio.updateButton(tabId, audioButton)

    tabEl.querySelectorAll('.permission-request-icon').forEach(el => el.remove())

    permissionRequests.getButtons(tabId).reverse().forEach(function (button) {
      tabEl.insertBefore(button, tabEl.children[0])
    })

    const secIcon = tabEl.getElementsByClassName('icon-tab-not-secure')[0]
    if (tabData.secure === false) {
      secIcon.hidden = false
    } else {
      secIcon.hidden = true
    }
  },
  updateAll: function () {
    empty(tabBar.containerInner)
    tabBar.tabElementMap = {}

    tabs.get().forEach(function (tab) {
      const el = tabBar.createTab(tab)
      tabBar.containerInner.appendChild(el)
      tabBar.tabElementMap[tab.id] = el
    })

    if (tabs.getSelected()) {
      tabBar.setActiveTab(tabs.getSelected())
    }
  },
  addTab: function (tabId) {
    const tab = tabs.get(tabId)
    const index = tabs.getIndex(tabId)

    const tabEl = tabBar.createTab(tab)
    tabBar.containerInner.insertBefore(tabEl, tabBar.containerInner.childNodes[index])
    tabBar.tabElementMap[tabId] = tabEl
  },
  removeTab: function (tabId) {
    const tabEl = tabBar.getTab(tabId)
    if (tabEl) {
      // The tab does not have a corresponding .tab-item element.
      // This happens when destroying tabs from other task where this .tab-item is not present
      tabBar.containerInner.removeChild(tabEl)
      delete tabBar.tabElementMap[tabId]
    }
  },
  handleDividerPreference: function (dividerPreference) {
    if (dividerPreference === true) {
      tabBar.navBar.classList.add('show-dividers')
    } else {
      tabBar.navBar.classList.remove('show-dividers')
    }
  }
}

settings.listen('showDividerBetweenTabs', function (dividerPreference) {
  tabBar.handleDividerPreference(dividerPreference)
})

/* progress bar events */

webviews.bindEvent('did-start-loading', function (tabId) {
  progressBar.update(tabBar.getTab(tabId).querySelector('.progress-bar'), 'start')
})

webviews.bindEvent('did-stop-loading', function (tabId) {
  progressBar.update(tabBar.getTab(tabId).querySelector('.progress-bar'), 'finish')
})

tasks.on('tab-updated', function (id, key) {
  const updateKeys = ['title', 'secure', 'url', 'muted', 'hasAudio']
  if (updateKeys.includes(key)) {
    tabBar.updateTab(id)
  }
})

permissionRequests.onChange(function (tabId) {
  tabBar.updateTab(tabId)
})

if (window.platformType === 'mac') {
  tabBar.dragulaInstance.containers = []
} else {
  tabBar.dragulaInstance.on('drop', function (el, target, source, sibling) {
    const tabId = el.getAttribute('data-tab')
    if (sibling) {
      var adjacentTabId = sibling.getAttribute('data-tab')
    }

    const oldTab = tabs.splice(tabs.getIndex(tabId), 1)[0]

    if (adjacentTabId) {
      var newIdx = tabs.getIndex(adjacentTabId)
    } else {
    // tab was inserted at end
      var newIdx = tabs.count()
    }
    tabs.splice(newIdx, 0, oldTab)
  })
}

tabBar.container.addEventListener('dragover', e => e.preventDefault())

tabBar.container.addEventListener('drop', e => {
  e.preventDefault()
  const data = e.dataTransfer
  require('browserUI.js').addTab(tabs.add({
    url: data.files[0] ? 'file://' + data.files[0].path : data.getData('text'),
    private: tabs.get(tabs.getSelected()).private
  }), { enterEditMode: false, openInBackground: !settings.get('openTabsInForeground') })
})

module.exports = tabBar
