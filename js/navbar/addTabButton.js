const browserUI = require('browserUI.js')

const addTabButton = document.getElementById('add-tab-button')

function initialize () {
  addTabButton.addEventListener('click', function (e) {
    browserUI.addTab()
  })
}

module.exports = { initialize }
