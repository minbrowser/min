var lastTabDeletion = 0 //TODO get rid of this

var tabBar = {
    container: document.getElementById('tabs'),
    tabElementMap: {}, //tabId: tab element
    getTab: function (tabId) {
        return tabBar.tabElementMap[tabId]
    },
    getTabInput: function (tabId) {
        return document.querySelector('.tab-item[data-tab="{id}"] .tab-input'.replace('{id}', tabId))
    },
    setActiveTab: function (tabId) {
        var activeTab = document.querySelector('.tab-item.active')

        if (activeTab) {
            activeTab.classList.remove('active')
        }

        var el = tabBar.getTab(tabId)
        el.classList.add('active')

        requestIdleCallback(function () {
            requestAnimationFrame(function () {
                el.scrollIntoView({
                    behavior: 'smooth'
                })
            })
        }, {
                timeout: 1500
            })
    },
    enterEditMode: function (tabId, editingValue) {
        // editingValue: an optional string to show in the searchbar instead of the current URL
        taskOverlay.hide()

        var tabEl = tabBar.getTab(tabId)
        var webview = webviews.get(tabId)

        var currentURL = urlParser.getDisplayURL(tabs.get(tabId).url)

        if (currentURL === 'about:blank') {
            currentURL = ''
        }

        var input = tabBar.getTabInput(tabId)

        document.body.classList.add('is-edit-mode')
        tabEl.classList.add('selected')

        input.value = editingValue || currentURL
        input.focus()
        if (!editingValue) {
            input.select()
        }

        showSearchbar(input)

        if (editingValue) {
            showSearchbarResults(editingValue, input, null)
        } else {
            showSearchbarResults('', input, null)
        }

        // show keyword suggestions in the searchbar

        if (webview.send) { // before first webview navigation, this will be undefined
            webview.send('getKeywordsData')
        }
    },
    leaveEditMode: function (options) {
        var selTab = document.querySelector('.tab-item.selected')
        if (selTab) {
            selTab.classList.remove('selected')
        }
        if (options && options.blur) {
            var input = document.querySelector('.tab-item .tab-input:focus')
            if (input) {
                input.blur()
            }
        }

        document.body.classList.remove('is-edit-mode')
        hidesearchbar()
    },
    rerenderTab: function (tabId) {
        var tabEl = tabBar.getTab(tabId)
        var tabData = tabs.get(tabId)

        var tabTitle = tabData.title || l('newTabLabel')

        tabEl.title = tabTitle
        var titleEl = tabEl.querySelector('.tab-view-contents .title')
        titleEl.textContent = tabTitle

        var secIcon = tabEl.getElementsByClassName('icon-tab-not-secure')[0]

        if (tabData.secure === false) {
            if (!secIcon) {
                var iconArea = tabEl.querySelector('.tab-icon-area')
                iconArea.insertAdjacentHTML('beforeend', "<i class='fa fa-unlock icon-tab-not-secure tab-info-icon' title='" + l('connectionNotSecure') + "'></i>")
            }
        } else if (secIcon) {
            secIcon.parentNode.removeChild(secIcon)
        }

        // update the star to reflect whether the page is bookmarked or not
        bookmarks.renderStar(tabId)
    },
    rerenderAll: function () {
        empty(tabBar.container)
        tabBar.tabElementMap = {}
        for (var i = 0; i < tabs.length; i++) {
            var el = tabBar.createElement(tabs[i])
            tabBar.container.appendChild(el)
            tabBar.tabElementMap[tabs[i].id] = el
        }
    },
    handleProgressBar: function (tabId, status) {
        var tabEl = tabBar.getTab(tabId)
        var bar = tabEl.querySelector('.progress-bar')

        if (status === 'start') {
            var loadID = Date.now().toString()
            bar.setAttribute('loading', loadID) // we need to use unique ID's to ensure that the same page that was loading initialy is the same page that is loading 4 seconds later
            setTimeout(function () {
                if (bar.getAttribute('loading') === loadID) {
                    bar.hidden = false
                    requestAnimationFrame(function () {
                        bar.className = 'progress-bar p25'
                    })
                }
            }, 4000)
        } else {
            bar.setAttribute('loading', 'false')
            if (bar.classList.contains('p25')) {
                bar.className = 'progress-bar p100'
                setTimeout(function () {
                    bar.className = 'progress-bar p0'
                    bar.hidden = true
                }, 500)
            }
        }
    },
    createElement: function (data) {
        var url = urlParser.parse(data.url)
        var tabTitle = data.title || l('newTabLabel')

        var tabEl = document.createElement('div')
        tabEl.className = 'tab-item'
        tabEl.setAttribute('data-tab', data.id)
        tabEl.title = tabTitle

        /* css :hover selectors are buggy when a webview is focused */
        tabEl.addEventListener('mouseenter', function (e) {
            this.classList.add('jshover')
        })

        tabEl.addEventListener('mouseleave', function (e) {
            this.classList.remove('jshover')
        })

        var ec = document.createElement('div')
        ec.className = 'tab-edit-contents'

        var input = document.createElement('input')
        input.className = 'tab-input mousetrap'
        input.setAttribute('placeholder', l('searchbarPlaceholder'))
        input.value = url

        ec.appendChild(input)
        ec.appendChild(bookmarks.getStar(data.id))

        tabEl.appendChild(ec)

        var vc = document.createElement('div')
        vc.className = 'tab-view-contents'
        vc.appendChild(readerView.getButton(data.id))

        var pbContainer = document.createElement('div')
        pbContainer.className = 'progress-bar-container'
        vc.appendChild(pbContainer)
        var pb = document.createElement('div')
        pb.className = 'progress-bar p0'
        pb.hidden = true
        pbContainer.appendChild(pb)

        // icons

        var iconArea = document.createElement('span')
        iconArea.className = 'tab-icon-area'

        var closeTabButton = document.createElement('i')
        closeTabButton.classList.add('tab-close-button')
        closeTabButton.classList.add('fa')
        closeTabButton.classList.add('fa-times-circle')

        closeTabButton.addEventListener('click', function (e) {
            closeTab(data.id)

            // prevent the searchbar from being opened
            e.stopPropagation()
        })

        iconArea.appendChild(closeTabButton)

        if (data.private) {
            iconArea.insertAdjacentHTML('afterbegin', "<i class='fa fa-eye-slash icon-tab-is-private tab-info-icon'></i>")
            vc.setAttribute('title', l('privateTab'))
        }

        vc.appendChild(iconArea)

        // title

        var title = document.createElement('span')
        title.className = 'title'
        title.textContent = tabTitle

        vc.appendChild(title)

        tabEl.appendChild(vc)

        input.addEventListener('keydown', function (e) {
            if (e.keyCode === 9 || e.keyCode === 40) { // if the tab or arrow down key was pressed
                focusSearchbarItem()
                e.preventDefault()
            }
        })

        // keypress doesn't fire on delete key - use keyup instead
        input.addEventListener('keyup', function (e) {
            if (e.keyCode === 8) {
                showSearchbarResults(this.value, this, e)
            }
        })

        input.addEventListener('keypress', function (e) {
            if (e.keyCode === 13) { // return key pressed; update the url
                openURLFromSearchbar(this.value, e)
            } else if (e.keyCode === 9) {
                return
                // tab key, do nothing - in keydown listener
            } else if (e.keyCode === 16) {
                return
                // shift key, do nothing
            } else if (e.keyCode === 8) {
                return
                // delete key is handled in keyUp
            } else { // show the searchbar
                showSearchbarResults(this.value, this, e)
            }

            // on keydown, if the autocomplete result doesn't change, we move the selection instead of regenerating it to avoid race conditions with typing. Adapted from https://github.com/patrickburke/jquery.inlineComplete

            var v = String.fromCharCode(e.keyCode).toLowerCase()
            var sel = this.value.substring(this.selectionStart, this.selectionEnd).indexOf(v)

            if (v && sel === 0) {
                this.selectionStart += 1
                e.preventDefault()
            }
        })

        // prevent clicking in the input from re-entering edit-tab mode

        input.addEventListener('click', function (e) {
            e.stopPropagation()
        })

        // click to enter edit mode or switch to a tab
        tabEl.addEventListener('click', function (e) {
            if (tabs.getSelected() !== data.id) { // else switch to tab if it isn't focused
                switchToTab(data.id)
            } else { // the tab is focused, edit tab instead
                tabBar.enterEditMode(data.id)
            }
        })

        tabEl.addEventListener('auxclick', function (e) {
            if (e.which === 2) { // if mouse middle click -> close tab
                closeTab(data.id)
            }
        })

        tabEl.addEventListener('mousewheel', function (e) {
            if (e.deltaY > 65 && e.deltaX < 10 && Date.now() - lastTabDeletion > 650) { // swipe up to delete tabs
                lastTabDeletion = Date.now()

                /* tab deletion is disabled in focus mode */
                if (isFocusMode) {
                    showFocusModeError()
                    return
                }

                var tab = this.getAttribute('data-tab')
                this.style.transform = 'translateY(-100%)'

                setTimeout(function () {
                    closeTab(tab)
                }, 150) // wait until the animation has completed
            }
        })

        return tabEl
    },
    addTab: function (tabId) {
        var tab = tabs.get(tabId)
        var index = tabs.getIndex(tabId)

        var tabEl = tabBar.createElement(tab)
        tabBar.container.insertBefore(tabEl, tabBar.container.childNodes[index])
        tabBar.tabElementMap[tabId] = tabEl
    },
    removeTab: function (tabId) {
        var tabEl = tabBar.getTab(tabId)
        if (tabEl) {
            // The tab does not have a coresponding .tab-item element.
            // This happens when destroying tabs from other task where this .tab-item is not present
            tabBar.container.removeChild(tabEl)
            delete tabBar.tabElementMap[tabId]
        }
    }
}

// when we click outside the navbar, we leave editing mode

webviews.bindEvent('focus', function () {
    tabBar.leaveEditMode()
})
