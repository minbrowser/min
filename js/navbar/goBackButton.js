var goBackButton = document.getElementById('back-button')

goBackButton.title = l('goBack')

goBackButton.addEventListener('click', function (e) {
  getWebview(tabs.getSelected()).goBack()
})

settings.get('historyButton', function (value) {
  if (value === false) {
    goBackButton.style.display = 'none'
  }
})
