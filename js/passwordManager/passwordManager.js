var { spawn } = require('child_process')

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

// Bitwarden password manager. Requires session key to unlock the vault.
class Bitwarden {
  constructor(key) {
    this.sessionKey = key
  }

  async getSuggestions(domain) {
    return new Promise((resolve, reject) => {
      let process = new ProcessSpawner('bw', ['list', 'items', '--url', domain, '--session', this.sessionKey])
      process.execute().then(data => {
        const matches = JSON.parse(data)
        let credentials = matches.map(match => {
            const { login: { username, password } } = match
            return { username, password, manager: 'Bitwarden' }
        })
        resolve(credentials)
      }).catch(ex => {
        // We dump the output into the console and silence the exception here to
        // to make sure other password managers will have a chance to do the search.
        const { error, data } = ex
        console.log('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
        resolve([])
      })
    })
  }
}

// Gathers suggestions from all available password managers and returns a Promise
// which resolves into an array of credentials ({ username, password, manager })
async function collectSuggestions(domain) {
  let suggestionPromises = passwordManagers.map(manager => {
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
    settings.get('bitwardenSessionKey', (key) => {
      passwordManagers.push(new Bitwarden(key))
    })
  }
})

webviews.bindIPC('password-autofill', function (webview, tab) {
  if (passwordManagers.length == 0) {
    return
  }

  webviews.callAsync(tab, 'getURL', null, (err, src) => {
    var domain = new URL(src).hostname
    if (domain.startsWith('www.')) {
      domain = domain.slice(4)
    }
      
    var self = this
    collectSuggestions(domain).then(credentials => {
      if (credentials.length > 0) {
        webview.send('password-autofill-match', credentials)
      }
    })
 })
})
