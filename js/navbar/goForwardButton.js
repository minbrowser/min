var goForwardButton = document.getElementById('forward-button')

goForwardButton.title = l('goForward')

goForwardButton.addEventListener('click', function (e) {
  getWebview(tabs.getSelected()).goForward()
})
