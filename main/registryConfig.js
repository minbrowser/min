var regedit = require('regedit')

var installPath = process.execPath

var keysToCreate = [
  'HKCR\\Min',
  'HKCR\\Min\\Application',
  'HKCR\\Min\\DefaulIcon',
  'HKCR\\Min\\shell\\open\\command',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\FileAssociations',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\StartMenu',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\Capabilities\\URLAssociations',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\DefaultIcon',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell\\open\\command'
]

var keysToDelete = [
  'HKCR\\Min',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min'
]

var registryConfig = {
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
    ApplicationIcon: {
      value: installPath + ',0',
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
  'HKCR\\Min\\DefaulIcon': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    }
  },
  'HKCR\\Min\\shell\\open\\command': {
    default: {
      value: '"' + installPath + '" "%1"',
      type: 'REG_DEFAULT'
    }
  },
  'HKCR\\.htm\\OpenWithProgIds': {
    Min: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCR\\.html\\OpenWithProgIds': {
    Min: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCR\\.pdf\\OpenWithProgIds': {
    Min: {
      value: 'Empty',
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
    },
    urn: {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\DefaultIcon': {
    default: {
      value: installPath + ',0',
      type: 'REG_DEFAULT'
    }
  },
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet\\Min\\shell\\open\\command': {
    default: {
      value: installPath,
      type: 'REG_DEFAULT'
    }
  }
}

var registryInstaller = {
  install: function () {
    return new Promise(function (resolve, reject) {
      regedit.createKey(keysToCreate, function (err) {
        regedit.putValue(registryConfig, function (err) {
          if (err) {
            reject()
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
          reject()
        } else {
          resolve()
        }
      })
    })
  }
}
