const webviews = require('webviews.js')
const settings = require('util/settings/settings.js')
const PasswordManagers = require('passwordManager/passwordManager.js')
const modalMode = require('modalMode.js')

const passwordViewer = {
  container: document.getElementById('password-viewer'),
  listContainer: document.getElementById('password-viewer-list'),
  emptyHeading: document.getElementById('password-viewer-empty'),
  closeButton: document.querySelector('#password-viewer .modal-close-button'),
  exportButton: document.getElementById('password-viewer-export'),
  importButton: document.getElementById('password-viewer-import'),
  createCredentialListElement: function (credential) {
    var container = document.createElement('div')

    var domainEl = document.createElement('span')
    domainEl.className = 'domain-name'
    domainEl.textContent = credential.domain
    container.appendChild(domainEl)

    var usernameEl = document.createElement('input')
    usernameEl.value = credential.username
    usernameEl.disabled = true
    container.appendChild(usernameEl)

    var passwordEl = document.createElement('input')
    passwordEl.type = 'password'
    passwordEl.value = credential.password
    passwordEl.disabled = true
    container.appendChild(passwordEl)

    var revealButton = document.createElement('button')
    revealButton.className = 'i carbon:view'
    revealButton.addEventListener('click', function () {
      if (passwordEl.type === 'password') {
        passwordEl.type = 'text'
        revealButton.classList.remove('carbon:view')
        revealButton.classList.add('carbon:view-off')
      } else {
        passwordEl.type = 'password'
        revealButton.classList.add('carbon:view')
        revealButton.classList.remove('carbon:view-off')
      }
    })
    container.appendChild(revealButton)

    var deleteButton = document.createElement('button')
    deleteButton.className = 'i carbon:trash-can'
    container.appendChild(deleteButton)

    deleteButton.addEventListener('click', function () {
      if (confirm(l('deletePassword').replace('%s', credential.domain))) {
        PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
          manager.deleteCredential(credential.domain, credential.username)
          container.remove()
          passwordViewer._updatePasswordListFooter()
        })
      }
    })

    return container
  },
  createNeverSaveDomainElement: function (domain) {
    var container = document.createElement('div')

    var domainEl = document.createElement('span')
    domainEl.className = 'domain-name'
    domainEl.textContent = domain
    container.appendChild(domainEl)

    var descriptionEl = document.createElement('span')
    descriptionEl.className = 'description'
    descriptionEl.textContent = l('savedPasswordsNeverSavedLabel')
    container.appendChild(descriptionEl)

    var deleteButton = document.createElement('button')
    deleteButton.className = 'i carbon:trash-can'
    container.appendChild(deleteButton)

    deleteButton.addEventListener('click', function () {
      settings.set('passwordsNeverSaveDomains', settings.get('passwordsNeverSaveDomains').filter(d => d !== domain))
      container.remove()
      passwordViewer._updatePasswordListFooter()
    })

    return container
  },
  _renderPasswordList: function (credentials) {
    credentials.forEach(function (cred) {
      passwordViewer.listContainer.appendChild(passwordViewer.createCredentialListElement(cred))
    })

    const neverSaveDomains = settings.get('passwordsNeverSaveDomains') || []

    neverSaveDomains.forEach(function (domain) {
      passwordViewer.listContainer.appendChild(passwordViewer.createNeverSaveDomainElement(domain))
    })

    passwordViewer._updatePasswordListFooter()
  },
  _updatePasswordListFooter: function () {
    const hasCredentials = (passwordViewer.listContainer.children.length !== 0)
    passwordViewer.emptyHeading.hidden = hasCredentials
    passwordViewer.importButton.hidden = hasCredentials
    passwordViewer.exportButton.hidden = !hasCredentials
  },
  show: function () {
    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager.getAllCredentials) {
        throw new Error('unsupported password manager')
      }

      manager.getAllCredentials().then(function (credentials) {
        webviews.requestPlaceholder('passwordViewer')
        modalMode.toggle(true, {
          onDismiss: passwordViewer.hide
        })
        passwordViewer.container.hidden = false

        passwordViewer._renderPasswordList(credentials)
      })
    })
  },
  importCredentials: async function () {
    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager.importCredentials) {
        throw new Error('unsupported password manager')
      }

      manager.importCredentials().then(function (credentials) {
        passwordViewer._renderPasswordList(credentials)
      })
    })
  },
  exportCredentials: function () {
    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager.getAllCredentials) {
        throw new Error('unsupported password manager')
      }

      manager.getAllCredentials().then(function (credentials) {
        if (credentials.length === 0) return

        const credentialsWithoutManager = credentials.map(function (credential) {
          return {
            domain: credential.domain,
            username: credential.username,
            password: credential.password
          }
        })

        const blob = new Blob([JSON.stringify({
          version: 1,
          credentials: credentialsWithoutManager
        }, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'credentials.json'
        anchor.click()
        URL.revokeObjectURL(url)
      })
    })
  },
  hide: function () {
    webviews.hidePlaceholder('passwordViewer')
    modalMode.toggle(false)
    empty(passwordViewer.listContainer)
    passwordViewer.container.hidden = true
  },
  initialize: function () {
    passwordViewer.exportButton.addEventListener('click', passwordViewer.exportCredentials)
    passwordViewer.importButton.addEventListener('click', passwordViewer.importCredentials)
    passwordViewer.closeButton.addEventListener('click', passwordViewer.hide)
    webviews.bindIPC('showCredentialList', function () {
      passwordViewer.show()
    })
  }
}

module.exports = passwordViewer
