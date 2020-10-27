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
  },
  'Built-in password manager': {
    name: 'Built-in password manager'
  }
}

var currentPasswordManager = null
settings.listen('passwordManager', function (value) {
  if (value && value.name) {
    currentPasswordManager = value
  } else {
    currentPasswordManager = passwordManagers['Built-in password manager']
  }
})

window.currentPasswordManager = currentPasswordManager
