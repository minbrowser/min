var goBackButton = document.getElementById('back-button')
var navigationHistory = document.getElementById('navigation-history')
var navigationHistoryOpened = false
var pressTimer

goBackButton.title = l('goBack')

goBackButton.addEventListener('click', function (e) {
  if (!navigationHistoryOpened) {
    var webview = webviews.get(tabs.getSelected())
    if (webview.canGoBack()) {
      webview.goBack()
    } else if (webview.canGoForward()) {
      webview.goForward()
    }
  }
})

goBackButton.addEventListener('mouseup', function (e) {
	clearTimeout(pressTimer)
})

goBackButton.addEventListener('mousedown', function (e) {
	pressTimer = window.setTimeout(function() {
    var webview = webviews.get(tabs.getSelected())
    var tabHistory = webview.getWebContents().history
    var currentIndex = webview.getWebContents().getActiveIndex()
    var backForwardHistory = []

    if (webview.canGoBack()) {
      backForwardHistory = tabHistory.slice(0, currentIndex).reverse()
    } else if (webview.canGoForward()) {
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
  var webview = webviews.get(tabs.getSelected())

  var currentIndex = webview.getWebContents().getActiveIndex()
  var delta = webview.canGoBack() ? -index : index
  console.log(delta)
  webview.goToIndex(currentIndex + delta)

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
