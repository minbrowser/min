var addTabButton = document.getElementById('add-tab-button')

addTabButton.addEventListener('click', function (e) {
  var newTab = tabs.add({}, tabs.getIndex(tabs.getSelected()) + 1)
  addTab(newTab)
})
