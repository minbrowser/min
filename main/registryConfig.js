var regedit = require('regedit')

var installPath = process.execPath

var keysToCreate = [
  'HKCU\\Software\\Classes\\fireMin',
  'HKCU\\Software\\Classes\\fireMin\\Application',
  'HKCU\\Software\\Classes\\fireMin\\DefaulIcon',
  'HKCU\\Software\\Classes\\fireMin\\shell\\open\\command',
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities\\FileAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities\\StartMenu',
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities\\URLAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\DefaultIcon',
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\InstallInfo',
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\shell\\open\\command'
]

var registryConfig = {
  'HKCU\\Software\\RegisteredApplications': {
    fireMin: {
      value: 'Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\fireMin': {
    default: {
      value: 'fireMin Browser Document',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\fireMin\\Application': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    },
    ApplicationName: {
      value: 'fireMin',
      type: 'REG_SZ'
    },
    AppUserModelId: {
      value: 'fireMin',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\fireMin\\DefaulIcon': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\fireMin\\shell\\open\\command': {
    default: {
      value: '"' + installPath + '" "%1"',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\.htm\\OpenWithProgIds': {
    fireMin: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\.html\\OpenWithProgIds': {
    fireMin: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities\\FileAssociations': {
    '.htm': {
      value: 'fireMin',
      type: 'REG_SZ'
    },
    '.html': {
      value: 'fireMin',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities\\StartMenu': {
    StartMenuInternet: {
      value: 'fireMin',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\Capabilities\\URLAssociations': {
    http: {
      value: 'fireMin',
      type: 'REG_SZ'
    },
    https: {
      value: 'fireMin',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\DefaultIcon': {
    default: {
      value: installPath + ',0',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\InstallInfo': {
    IconsVisible: {
      value: 1,
      type: 'REG_DWORD'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\fireMin\\shell\\open\\command': {
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
