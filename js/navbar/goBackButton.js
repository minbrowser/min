var goBackButton = document.getElementById('back-button')

goBackButton.title = l('goBack')

goBackButton.addEventListener('click', function (e) {
  getWebview(tabs.getSelected()).goBack()
})
