var { spawn } = require('child_process')
const BrowserWindow = require('electron').remote.BrowserWindow

// List of configured password managers. Each password manager is expected to 
// have getSuggestions(domain) method that returns a Promise with credentials
// suggestions matching given domain name.
var passwordManagers = []

// Helper class to control child process output.
// Bufferizes output from stdout and stderr, waits until the process exits,
// and then resolves the promise with gathered data.
class ProcessSpawner {
  constructor(command, args) {
    this.command = command
    this.args = args
    this.data = ""
    this.error = ""
  }

  async execute() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.command, this.args)
      
      process.stdout.on('data', (data) => {
        this.data += data
      })
    
      process.stderr.on('data', (data) => {
        this.error += data
      })

      process.on('close', (code) => {
        if (code != 0) {
          reject({ error: this.error, data: this.data })
        } else {
          resolve(this.data)
        }
      })
    })
  }
}

var promptWindow = null

// Bitwarden password manager. Requires session key to unlock the vault.
class Bitwarden {
  constructor() {
    this.sessionKey = null
    this.lastCall = null
  }

  isUnlocked() {
    return this.sessionKey != null
  }

  async getSuggestions(domain) {
    if (this.lastCall != null) {
      return this.lastCall
    }

    let start = null
    if (this.sessionKey == null) {
      start = this.tryToUnlock()
    } else {
      start = Promise.resolve(this.sessionKey)
    }

    this.lastCall = start.then(() => this.loadSuggestions(domain)).then(suggestions => {
      this.lastCall = null
      return suggestions
    }).catch(ex => {
      this.lastCall = null
    })

    return this.lastCall
  }

  async loadSuggestions(domain) {
    return new Promise((resolve, reject) => {
      let process = new ProcessSpawner('bw', ['list', 'items', '--url', domain, '--session', this.sessionKey])
      process.execute().then(data => {
        const matches = JSON.parse(data)
        let credentials = matches.map(match => {
            const { login: { username, password } } = match
            return { username, password, manager: 'Bitwarden' }
        })
        this.unlocking = false
        resolve(credentials)
      }).catch(ex => {
        // We dump the output into the console and silence the exception here to
        // to make sure other password managers will have a chance to do the search.
        const { error, data } = ex
        console.log('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
        this.unlocking = false
        resolve([])
      })
    })
  }

  async tryToUnlock(callback) {
    return new Promise((resolve, reject) => {
      this.promptForMasterPassword().then(result => {
        return this.unlockStore(result)
      }).then(sessionKey => {
        this.sessionKey = sessionKey
        resolve()
      }).catch (ex => {
        reject()
      })
    })
  }
  
  async unlockStore(password) {
    return new Promise((resolve, reject) => {
      let process = new ProcessSpawner('bw', ['unlock', '--raw', password])
      process.execute().then(data => {
        resolve(data)
      }).catch(ex => {
        const { error, data } = ex
        console.log('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
        reject()
      })
    })
  }

  async promptForMasterPassword() {
    return new Promise((resolve, reject) => {
      let password = ipc.sendSync('prompt', { text: 'Please enter Bitwarden master password to unlock the password store:' })
      if (password == null || password == '') {
        reject()
      } else {
        resolve(password)
      }
    })
  }
}

// Gathers suggestions from all available password managers and returns a Promise
// which resolves into an array of credentials ({ username, password, manager })
async function collectSuggestions(domain, force) {
  let managersToCheck = passwordManagers
  if (!force) {
    managersToCheck = passwordManagers.filter(manager => manager.isUnlocked())
  }
  
  let suggestionPromises = managersToCheck.map(manager => {
    return manager.getSuggestions(domain)
  })

  return suggestionPromises.reduce((chain, currentPromise) => {
    return chain.then(results => 
      currentPromise.then(currentResult =>
        results.concat(currentResult)
      )
    )
  }, Promise.resolve([]))
}

settings.get('bitwardenEnabled', (value) => {
  if (value === true) {
    passwordManagers.push(new Bitwarden())
  }
})

webviews.bindIPC('password-autofill', function (webview, tab, args) {
  if (passwordManagers.length == 0) {
    return
  }

  webviews.callAsync(tab, 'getURL', null, (err, src) => {
    var domain = new URL(src).hostname
    if (domain.startsWith('www.')) {
      domain = domain.slice(4)
    }
      
    var self = this
    collectSuggestions(domain, args[0].force).then(credentials => {
      if (credentials.length > 0) {
        webview.send('password-autofill-match', credentials)
      }
    })
 })
})
