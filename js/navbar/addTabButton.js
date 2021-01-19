var browserUI = require('browserUI.js')

var addTabButton = document.getElementById('add-tab-button')

function initialize () {
  addTabButton.addEventListener('click', function (e) {
    browserUI.addTab()
  })
}

module.exports = { initialize }
