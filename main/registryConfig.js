var regedit = require('regedit')

var installPath = process.execPath

var keysToCreate = [
  'HKCR\\Min\\Application',
  'HKCR\\Min\\DefaultIcon',
  'HKCR\\Min\\shell\\open\\command',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\FileAssociations',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\StartMenu',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\URLAssociations',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\DefaultIcon',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell\\open\\command'
]

var valuesToPut = {
  'HKLM\\SOFTWARE\\RegisteredApplications': {
    Min: {
      value: 'SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities',
      type: 'REG_SZ'
    }
  },
  'HKCR\\Min': {
    default: {
      value: 'Min Browser Document',
      type: 'REG_DEFAULT'
    }
  },
  'HKCR\\Min\\Application': {
    ApplicationDescription: {
      value: 'Access the Internet',
      type: 'REG_SZ'
    },
    ApplicationIcon: {
      value: `${installPath},0`,
      type: 'REG_SZ'
    },
    ApplicationName: {
      value: 'Min',
      type: 'REG_SZ'
    },
    AppUserModelId: {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKCR\\Min\\DefaultIcon': {
    default: {
      value: `${installPath},0`,
      type: 'REG_DEFAULT'
    }
  },
  'HKCR\\Min\\shell\\open\\command': {
    default: {
      value: `"${installPath}" --single-argument %1`,
      type: 'REG_DEFAULT'
    }
  },
  'HKCR\\.htm\\OpenWithProgIds': {
    Min: {
      value: '',
      type: 'REG_SZ'
    }
  },
  'HKCR\\.html\\OpenWithProgIds': {
    Min: {
      value: '',
      type: 'REG_SZ'
    }
  },
  'HKCR\\.pdf\\OpenWithProgIds': {
    Min: {
      value: '',
      type: 'REG_SZ'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min': {
    default: {
      value: 'Min',
      type: 'REG_DEFAULT'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities': {
    ApplicationDescription: {
      value: 'A fast, minimal browser that protects your privacy',
      type: 'REG_SZ'
    },
    ApplicationIcon: {
      value: `${installPath},0`,
      type: 'REG_SZ'
    },
    ApplicationName: {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\FileAssociations': {
    '.htm': {
      value: 'Min',
      type: 'REG_SZ'
    },
    '.html': {
      value: 'Min',
      type: 'REG_SZ'
    },
    '.pdf': {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\StartMenu': {
    StartMenuInternet: {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\URLAssociations': {
    http: {
      value: 'Min',
      type: 'REG_SZ'
    },
    https: {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\DefaultIcon': {
    default: {
      value: `${installPath},0`,
      type: 'REG_DEFAULT'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell\\open\\command': {
    default: {
      value: `"${installPath}"`,
      type: 'REG_DEFAULT'
    }
  }
}

var keysToDelete = [
  'HKCR\\Min',
  'HKCR\\Min\\Application',
  'HKCR\\Min\\DefaultIcon',
  'HKCR\\Min\\shell',
  'HKCR\\Min\\shell\\open',
  'HKCR\\Min\\shell\\open\\command',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\FileAssociations',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\StartMenu',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\URLAssociations',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\DefaultIcon',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell\\open',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell\\open\\command'
]

var valuesToDelete = [
  'HKLM\\SOFTWARE\\RegisteredApplications\\Min',
  'HKCR\\.htm\\OpenWithProgIds\\Min',
  'HKCR\\.html\\OpenWithProgIds\\Min',
  'HKCR\\.pdf\\OpenWithProgIds\\Min'
]

var registryInstaller = {
  install: function () {
    return new Promise(function (resolve, reject) {
      regedit.createKey(keysToCreate, function (err) {
        if (err) {
          reject(err)
        }
        regedit.putValue(valuesToPut, function (err) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    })
  },
  uninstall: function () {
    return new Promise(function (resolve, reject) {
      regedit.deleteKey(keysToDelete, function (err) {
        if (err) {
          reject(err)
        }
        regedit.deleteValue(valuesToDelete, function (err) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    })
  }
};

(async function () {
  if (process.argv.some(arg => arg === '--install')) {
    await registryInstaller.install()
    process.exit()
  }
  if (process.argv.some(arg => arg === '--uninstall')) {
    await registryInstaller.install()
    process.exit()
  }
})()
