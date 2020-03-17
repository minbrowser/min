if (typeof require !== 'undefined') {
  var settings = require('util/settings.js')
}

var passwordManagers = {
  none: {
    name: 'none'
  },
  Bitwarden: {
    name: 'Bitwarden'
  },
  '1Password': {
    name: '1Password'
  }
}

var currentPasswordManager = null
settings.get('passwordManager', function (value) {
  if (value && value.name) {
    currentPasswordManager = value
  } else {
    currentPasswordManager = passwordManagers['none']
  }
})

window.currentPasswordManager = currentPasswordManager


