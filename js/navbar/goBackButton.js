var goBackButton = document.getElementById('back-button')
var navigationHistory = document.getElementById('navigation-history')
var navigationHistoryOpened = false
var pressTimer

goBackButton.title = l('goBack')

goBackButton.addEventListener('click', function (e) {
  if (!navigationHistoryOpened) {
    if (webviews.get(tabs.getSelected()).canGoBack()) {
      webviews.get(tabs.getSelected()).goBack()
    } else if (webviews.get(tabs.getSelected()).canGoForward()) {
      webviews.get(tabs.getSelected()).goForward()
    }
  }
})

goBackButton.addEventListener('mouseup', function (e) {
	clearTimeout(pressTimer)
})

goBackButton.addEventListener('mousedown', function (e) {
	pressTimer = window.setTimeout(function() {
    var tabHistory = webviews.get(tabs.getSelected()).getWebContents().history
    var currentIndex = webviews.get(tabs.getSelected()).getWebContents().getActiveIndex()
    var backForwardHistory = []

    if (webviews.get(tabs.getSelected()).canGoBack()) {
      backForwardHistory = tabHistory.slice(0, currentIndex).reverse()
    } else if (webviews.get(tabs.getSelected()).canGoForward()) {
      backForwardHistory = tabHistory.slice(currentIndex+1, tabHistory.length)
    }

    backForwardHistory.forEach(function (element, index) {
      var historyItem = document.createElement('li')

      historyItem.setAttribute('navigationindex', index+1)
      historyItem.innerHTML = element

      historyItem.addEventListener('click', function (e) {
        historyItemClicked(Number(this.getAttribute('navigationindex')))
      })

      navigationHistory.appendChild(historyItem)
    })

    navigationHistory.style.display = 'block'
    navigationHistoryOpened = true
	},500)
})

function historyItemClicked(index) {
  var currentIndex = webviews.get(tabs.getSelected()).getWebContents().getActiveIndex()

  if (webviews.get(tabs.getSelected()).canGoBack()) {
    webviews.get(tabs.getSelected()).goToIndex(currentIndex - index)
  } else {
    webviews.get(tabs.getSelected()).goToIndex(currentIndex + index)
  }

  hideNavigationHistory()
}

webviews.container.addEventListener('mousedown', function (e) {
  hideNavigationHistory()
})

function hideNavigationHistory() {
  navigationHistory.style.display = 'none'
  navigationHistory.innerHTML = ''
  navigationHistoryOpened = false
}

settings.get('historyButton', function (value) {
  if (value === true || value === undefined) {
    goBackButton.hidden = false
  } else {
    goBackButton.hidden = true
  }
})
