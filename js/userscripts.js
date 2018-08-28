/* implements userscript support */

var userScriptsEnabled = false
var domainScriptMap = {}

settings.get('userscriptsEnabled', function (value) {
  if (value === true) {
    userScriptsEnabled = true

    /* get a list of all the files */

    var path = require('path')
    var scriptDir = path.join(remote.app.getPath('userData'), 'userscripts')

    fs.readdir(scriptDir, function (err, files) {
      if (err || files.length === 0) {
        return
      }

      // store the scripts in memory
      files.forEach(function (filename) {
        if (filename.endsWith('.js')) {
          fs.readFile(path.join(scriptDir, filename), 'utf-8', function (err, file) {
            if (err || !file) {
              return
            }

            var domain = filename.slice(0, -3)
            if (domain.startsWith('www.')) {
              domain = domain.slice(4)
            }
            if (!domain) {
              return
            }
            domainScriptMap[domain] = file
          })
        }
      })
    })
  }
})

/* listen for load events and execute the scripts 
this listener has to be attached immediately so that we can capture events for
webviews that are created at startup
*/

webviews.bindEvent('dom-ready', function (e) {
  if (!userScriptsEnabled) {
    return
  }
  var tab = webviews.getTabFromContents(this)

  webviews.callAsync(tab, 'getURL', null, src => {
    try {
      var domain = new URL(src).hostname
      if (domain.startsWith('www.')) {
        domain = domain.slice(4)
      }
      // global script
      if (domainScriptMap.global) {
        this.executeJavaScript(domainScriptMap.global, false, null)
      }
      // domain-specific scripts
      if (domainScriptMap[domain]) {
        this.executeJavaScript(domainScriptMap[domain], false, null)
      }
    } catch(e) {
      console.warn(e)
    }
  })
})
