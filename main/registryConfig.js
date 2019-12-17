var regedit = require('regedit')

var installPath = process.execPath

var keysToCreate = [
  'HKCU\\Software\\Classes\\Min',
  'HKCU\\Software\\Classes\\Min\\Application',
  'HKCU\\Software\\Classes\\Min\\DefaulIcon',
  'HKCU\\Software\\Classes\\Min\\shell\\open\\command',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\Capabilities\\FileAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\Capabilities\\StartMenu',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\Capabilities\\URLAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\DefaultIcon',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\InstallInfo',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\shell\\open\\command'
]

var registryConfig = {
  'HKCU\\Software\\RegisteredApplications': {
    'Min': {
      value: 'Software\\Clients\\StartMenuInternet\\Min\\Capabilities',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\Min': {
    'default': {
      value: 'Min Browser Document',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\Min\\Application': {
    'ApplicationIcon': {
      value: installPath + ',0',
      type: 'REG_SZ'
    },
    'ApplicationName': {
      value: 'Min',
      type: 'REG_SZ'
    },
    'AppUserModelId': {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\Min\\DefaulIcon': {
    'ApplicationIcon': {
      value: installPath + ',0',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\Min\\shell\\open\\command': {
    'default': {
      value: '"' + installPath + '" "%1"',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\.htm\\OpenWithProgIds': {
    'Min': {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\.html\\OpenWithProgIds': {
    'Min': {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\Capabilities\\FileAssociations': {
    '.htm': {
      value: 'Min',
      type: 'REG_SZ'
    },
    '.html': {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\Capabilities\\StartMenu': {
    'StartMenuInternet': {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\Capabilities\\URLAssociations': {
    'http': {
      value: 'Min',
      type: 'REG_SZ'
    },
    'https': {
      value: 'Min',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\DefaultIcon': {
    'default': {
      value: installPath + ',0',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\InstallInfo': {
    'IconsVisible': {
      value: 1,
      type: 'REG_DWORD'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Min\\shell\\open\\command': {
    'default': {
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
      regedit.deleteKey(keysToCreate, function (err) {
        if (err) {
          reject()
        } else {
          resolve()
        }
      })
    })
  }
}
