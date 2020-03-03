const settings = require('util/settings/settings.js')
const webviews = require('webviews.js')
const ProcessSpawner = require('util/process.js')

const Bitwarden = require('js/passwordManager/bitwarden.js')
const OnePassword = require('js/passwordManager/onePassword.js')

const PasswordManagers = {
  // List of supported password managers. Each password manager is expected to
  // have getSuggestions(domain) method that returns a Promise with credentials
  // suggestions matching given domain name.
  managers: [
    new Bitwarden(),
    new OnePassword()
  ],
  // Returns an active password manager, which is the one that is selected in app's
  // settings.
  getActivePasswordManager: function () {
    if (PasswordManagers.managers.length == 0) {
      return null
    }

    let managerSetting = settings.get('passwordManager')
    if (managerSetting == null) {
      return null
    }

    return PasswordManagers.managers.find(mgr => mgr.name == managerSetting.name)
  },
  getConfiguredPasswordManager: async function () {
    let manager = PasswordManagers.getActivePasswordManager()
    if (!manager) {
      return null
    }

    let configured = await manager.checkIfConfigured()
    if (!configured) {
      return null
    }

    return manager
  },
  // Binds IPC events.
  initialize: function () {
    // Called when page preload script detects a form with username and password.
    webviews.bindIPC('password-autofill', function (webview, tab, args, frameId) {
      // We expect hostname of the source page/frame as a parameter.
      if (args.length == 0) {
        return
      }
      let hostname = args[0]

      PasswordManagers.getConfiguredPasswordManager().then((manager) => {
        if (!manager) {
          return
        }

        var domain = hostname
        if (domain.startsWith('www.')) {
          domain = domain.slice(4)
        }

        var self = this
        manager.getSuggestions(domain).then(credentials => {
          if (credentials != null) {
            webviews.callAsync(tab, 'getURL', null, function (err, topLevelURL) {
              var topLevelDomain = new URL(topLevelURL).hostname
              if (topLevelDomain.startsWith('www.')) {
                topLevelDomain = topLevelDomain.slice(4)
              }
              if (domain !== topLevelDomain) {
                console.warn("autofill isn't supported for 3rd-party frames")
                return;
              }
              webview.sendToFrame(frameId, 'password-autofill-match', {
                credentials,
                hostname
              })
            })
          }
        }).catch(e => {
          console.error('Failed to get password suggestions: ' + e.message)
        })
      })
    })

    webviews.bindIPC('password-autofill-check', function (webview, tab, args, frameId) {
      if (PasswordManagers.getActivePasswordManager()) {
        webview.sendToFrame(frameId, 'password-autofill-enabled')
      }
    })
  }
}

module.exports = PasswordManagers
