const webviews = require('webviews.js')
const urlParser = require('util/urlParser.js')

const trailSidebar = {
  container: null,
  visible: false,
  collapsedNodes: new Set(), // Track which nodes are collapsed in the UI

  initialize () {
    // Create sidebar container
    this.container = document.createElement('div')
    this.container.className = 'trail-sidebar'
    this.container.id = 'trail-sidebar'
    this.container.setAttribute('hidden', '')

    // Add header
    const header = document.createElement('div')
    header.className = 'trail-sidebar-header'
    
    const headerTitle = document.createElement('span')
    headerTitle.className = 'trail-sidebar-title'
    headerTitle.textContent = 'Trail'
    header.appendChild(headerTitle)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'trail-sidebar-close i carbon:close'
    closeBtn.addEventListener('click', () => this.hide())
    header.appendChild(closeBtn)

    this.container.appendChild(header)

    // Add tree container
    const treeContainer = document.createElement('div')
    treeContainer.className = 'trail-tree'
    treeContainer.id = 'trail-tree'
    this.container.appendChild(treeContainer)

    // Insert into DOM (after navbar, before webviews)
    const webviewsEl = document.getElementById('webviews')
    document.body.insertBefore(this.container, webviewsEl)

    // Listen for tab events to update tree
    this.setupEventListeners()
  },

  setupEventListeners () {
    // Update on tab changes
    tasks.on('tab-added', () => this.render())
    tasks.on('tab-destroyed', () => this.render())
    tasks.on('tab-selected', () => this.render())
    tasks.on('tab-updated', (id, key) => {
      if (['title', 'url'].includes(key)) {
        this.render()
      }
    })
    tasks.on('tab-reparented', () => this.render())
    tasks.on('tab-collapsed', () => this.render())
    tasks.on('tab-expanded', () => this.render())
    tasks.on('task-selected', () => this.render())
  },

  render () {
    if (!this.visible) return

    const treeContainer = document.getElementById('trail-tree')
    if (!treeContainer) return

    // Clear existing content
    treeContainer.innerHTML = ''

    const currentTask = tasks.getSelected()
    if (!currentTask) return

    // Get all root tabs (no parent)
    const rootTabs = tasks.getRootTabs(currentTask.id)
    const selectedTabId = tabs.getSelected()

    // Render each root and its descendants
    rootTabs.forEach(rootTab => {
      this.renderNode(rootTab, 0, treeContainer, selectedTabId)
    })
  },

  renderNode (tab, depth, container, selectedTabId) {
    const nodeEl = document.createElement('div')
    nodeEl.className = 'trail-node'
    nodeEl.setAttribute('data-tab-id', tab.id)
    nodeEl.style.setProperty('--depth', depth)

    if (tab.id === selectedTabId) {
      nodeEl.classList.add('selected')
    }

    // Get children for this tab
    const children = tasks.getChildren(tab.id)
    const hasChildren = children.length > 0
    const isCollapsed = tab.collapsed || this.collapsedNodes.has(tab.id)

    // Collapse/expand button
    const collapseBtn = document.createElement('span')
    collapseBtn.className = 'trail-collapse-btn'
    if (hasChildren) {
      collapseBtn.textContent = isCollapsed ? '▶' : '▼'
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleNodeCollapse(tab.id)
      })
    } else {
      collapseBtn.textContent = '•'
      collapseBtn.classList.add('trail-collapse-btn-leaf')
    }
    nodeEl.appendChild(collapseBtn)

    // Favicon
    const favicon = document.createElement('img')
    favicon.className = 'trail-favicon'
    const domain = urlParser.getDomain(tab.url)
    if (domain && !urlParser.isInternalURL(tab.url)) {
      favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
      favicon.onerror = () => {
        favicon.style.display = 'none'
      }
    } else {
      favicon.style.display = 'none'
    }
    nodeEl.appendChild(favicon)

    // Title
    const titleEl = document.createElement('span')
    titleEl.className = 'trail-title'
    
    let title = tab.title || tab.url || 'New Tab'
    // Truncate long titles
    if (title.length > 40) {
      title = title.substring(0, 40) + '…'
    }
    titleEl.textContent = title
    titleEl.title = tab.title || tab.url || 'New Tab' // Full title on hover
    nodeEl.appendChild(titleEl)

    // Click handler to switch tabs
    nodeEl.addEventListener('click', () => {
      const browserUI = require('browserUI.js')
      browserUI.switchToTab(tab.id)
    })

    container.appendChild(nodeEl)

    // Render children if not collapsed
    if (hasChildren && !isCollapsed) {
      children.forEach(child => {
        this.renderNode(child, depth + 1, container, selectedTabId)
      })
    }
  },

  toggleNodeCollapse (tabId) {
    const task = tasks.getTaskContainingTab(tabId)
    if (!task) return

    const tab = tabs.get(tabId)
    if (!tab) return

    // Toggle collapsed state
    if (tab.collapsed) {
      tasks.expandTab(tabId)
      this.collapsedNodes.delete(tabId)
    } else {
      tasks.collapseTab(tabId)
      this.collapsedNodes.add(tabId)
    }
  },

  show () {
    if (!this.container) return
    
    this.visible = true
    this.container.removeAttribute('hidden')
    document.body.classList.add('trail-sidebar-visible')
    this.render()
  },

  hide () {
    if (!this.container) return
    
    this.visible = false
    this.container.setAttribute('hidden', '')
    document.body.classList.remove('trail-sidebar-visible')
  },

  toggle () {
    if (this.visible) {
      this.hide()
    } else {
      this.show()
    }
  },

  isVisible () {
    return this.visible
  }
}

module.exports = trailSidebar
