const webviews = require('webviews.js')
const PasswordManagers = require('passwordManager/passwordManager.js')

const passwordCapture = {
  bar: document.getElementById('password-capture-bar'),
  usernameInput: document.getElementById('password-capture-username'),
  passwordInput: document.getElementById('password-capture-password'),
  saveButton: document.getElementById('password-capture-save'),
  currentDomain: null,
  showCaptureBar: function (username, password) {
    passwordCapture.bar.hidden = false
    passwordCapture.usernameInput.value = username || ''
    passwordCapture.passwordInput.value = password || ''
    webviews.adjustMargin([36, 0, 0, 0])
  },
  hideCaptureBar: function () {
    passwordCapture.bar.hidden = true
    passwordCapture.usernameInput.value = ''
    passwordCapture.passwordInput.value = ''
    passwordCapture.currentDomain = null
    webviews.adjustMargin([-36, 0, 0, 0])
  },
  handleRecieveCredentials: function (tab, args, frameId) {
    var domain = args[0][0]
    if (domain.startsWith('www.')) {
      domain = domain.slice(4)
    }

    var username = args[0][1][0] || ''
    var password = args[0][2][0] || ''

    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager || !manager.saveCredential) {
        // the password can't be saved
        return
      }

      // check if this username/password combo is already saved
      manager.getSuggestions(domain).then(function (credentials) {
        var alreadyExists = credentials.some(cred => cred.username === username && cred.password === password)
        if (!alreadyExists) {
          passwordCapture.currentDomain = domain
          passwordCapture.showCaptureBar(username, password)
        }
      })
    })
  },
  initialize: function () {
    webviews.bindIPC('password-form-filled', passwordCapture.handleRecieveCredentials)

    passwordCapture.saveButton.addEventListener('click', function () {
      if (passwordCapture.usernameInput.checkValidity() && passwordCapture.passwordInput.checkValidity()) {
        PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
          manager.saveCredential(passwordCapture.currentDomain, passwordCapture.usernameInput.value, passwordCapture.passwordInput.value)

          passwordCapture.hideCaptureBar()
        })
      }
    })
  }
}

module.exports = passwordCapture
