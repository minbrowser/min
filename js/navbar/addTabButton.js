const browserUI = require('browserUI.js')

const addTabButton = document.getElementById('add-tab-button')

addTabButton.addEventListener('click', function (e) {
  browserUI.addTab()
})
