var goForwardButton = document.getElementById('forward-button')

goForwardButton.title = l('goForward')

goForwardButton.addEventListener('click', function (e) {
  getWebview(tabs.getSelected()).goForward()
})

settings.get('historyButtons', function (value) {
  if (value === false)
  {
	  goForwardButton.style.display = 'none'
	  goForwardButton.removeAttribute('transition')
  }
})
