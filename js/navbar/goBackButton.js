var goBackButton = document.getElementById('back-button')

goBackButton.addEventListener('click', function (e) {
  webviews.goBackIgnoringRedirects(tabs.getSelected())
})

settings.get('historyButton', function (value) {
  if (value === true || value === undefined) {
    goBackButton.hidden = false
  } else {
    goBackButton.hidden = true
  }
})
