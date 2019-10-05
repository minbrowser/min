var browserUI = require('browserUI.js')

var addTabButton = document.getElementById('add-tab-button')

addTabButton.addEventListener('click', function (e) {
  browserUI.addTab()
})
