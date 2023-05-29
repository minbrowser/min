const webviews = require('webviews.js')
const settings = require('util/settings/settings.js')
const PasswordManagers = require('passwordManager/passwordManager.js')

const passwordCapture = {
  bar: document.getElementById('password-capture-bar'),
  description: document.getElementById('password-capture-description'),
  usernameInput: document.getElementById('password-capture-username'),
  passwordInput: document.getElementById('password-capture-password'),
  revealButton: document.getElementById('password-capture-reveal-password'),
  saveButton: document.getElementById('password-capture-save'),
  neverSaveButton: document.getElementById('password-capture-never-save'),
  closeButton: document.getElementById('password-capture-ignore'),
  currentDomain: null,
  barHeight: 0,

  showCaptureBar (username, password) {
    passwordCapture.description.textContent = l('passwordCaptureSavePassword').replace('%s', passwordCapture.currentDomain)
    passwordCapture.bar.hidden = false

    passwordCapture.passwordInput.type = 'password'
    passwordCapture.revealButton.classList.add('carbon:view')
    passwordCapture.revealButton.classList.remove('carbon:view-off')

    passwordCapture.usernameInput.value = username || ''
    passwordCapture.passwordInput.value = password || ''

    passwordCapture.barHeight = passwordCapture.bar.getBoundingClientRect().height
    webviews.adjustMargin([passwordCapture.barHeight, 0, 0, 0])
  },

  hideCaptureBar () {
    webviews.adjustMargin([passwordCapture.barHeight * -1, 0, 0, 0])

    passwordCapture.bar.hidden = true
    passwordCapture.usernameInput.value = ''
    passwordCapture.passwordInput.value = ''
    passwordCapture.currentDomain = null
  },

  togglePasswordVisibility () {
    if (passwordCapture.passwordInput.type === 'password') {
      passwordCapture.passwordInput.type = 'text'
      passwordCapture.revealButton.classList.remove('carbon:view')
      passwordCapture.revealButton.classList.add('carbon:view-off')
    } else {
      passwordCapture.passwordInput.type = 'password'
      passwordCapture.revealButton.classList.add('carbon:view')
      passwordCapture.revealButton.classList.remove('carbon:view-off')
    }
  },

  async handleReceivedCredentials (tab, args, frameId) {
    let domain = args[0][0]
    if (domain.startsWith('www.')) {
      domain = domain.slice(4)
    }

    if (settings.get('passwordsNeverSaveDomains') && settings.get('passwordsNeverSaveDomains').includes(domain)) {
      return
    }

    try {
      const username = args[0][1] || ''
      const password = args[0][2] || ''

      const manager = await PasswordManagers.getConfiguredPasswordManager()
      if (!manager || !manager.saveCredential) {
        // the password can't be saved
        return
      }

      // check if this username/password combo is already saved
      const credentials = await manager.getSuggestions(domain)
      const alreadyExists = credentials.some(cred => cred.username === username && cred.password === password)
      if (!alreadyExists) {
        if (!passwordCapture.bar.hidden) {
          passwordCapture.hideCaptureBar()
        }

        passwordCapture.currentDomain = domain
        passwordCapture.showCaptureBar(username, password)
      }
    } catch (e) {
      console.error(`Failed to get password suggestions: ${e.message}`)
    }
  },

  initialize () {
    passwordCapture.usernameInput.placeholder = l('username')
    passwordCapture.passwordInput.placeholder = l('password')

    webviews.bindIPC('password-form-filled', passwordCapture.handleReceivedCredentials)

    passwordCapture.saveButton.addEventListener('click', function () {
      if (passwordCapture.usernameInput.checkValidity() && passwordCapture.passwordInput.checkValidity()) {
        PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
          manager.saveCredential(passwordCapture.currentDomain, passwordCapture.usernameInput.value, passwordCapture.passwordInput.value)

          passwordCapture.hideCaptureBar()
        })
      }
    })

    passwordCapture.neverSaveButton.addEventListener('click', function () {
      settings.set('passwordsNeverSaveDomains', (settings.get('passwordsNeverSaveDomains') || []).concat([passwordCapture.currentDomain]))
      passwordCapture.hideCaptureBar()
    })

    passwordCapture.closeButton.addEventListener('click', passwordCapture.hideCaptureBar)
    passwordCapture.revealButton.addEventListener('click', passwordCapture.togglePasswordVisibility)

    // the bar can change height when the window is resized, so the webview needs to be resized in response
    window.addEventListener('resize', function () {
      if (!passwordCapture.bar.hidden) {
        const oldHeight = passwordCapture.barHeight
        passwordCapture.barHeight = passwordCapture.bar.getBoundingClientRect().height
        webviews.adjustMargin([passwordCapture.barHeight - oldHeight, 0, 0, 0])
      }
    })
  }
}

module.exports = passwordCapture
