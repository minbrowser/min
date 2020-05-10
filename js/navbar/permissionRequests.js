const webviews = require('webviews.js')

const permissionRequests = {
  requests: [],
  listeners: [],
  grantPermission: function (permissionId) {
    permissionRequests.requests.forEach(function (request) {
      if (request.permissionId && request.permissionId === permissionId) {
        ipc.send('permissionGranted', permissionId)
      }
    })
  },
  getIcons: function (request) {
    if (request.permission === 'notifications') {
      return ['fa-comments-o']
    } else if (request.permission === 'media') {
      var mediaIcons = {
        video: 'fa-video-camera',
        audio: 'fa-microphone'
      }
      return request.details.mediaTypes.map(t => mediaIcons[t])
    }
  },
  getButtons: function (tabId) {
    var buttons = []
    permissionRequests.requests.forEach(function (request) {
      if (request.tabId === tabId) {
        var button = document.createElement('button')
        button.className = 'tab-icon permission-request-icon'
        if (request.granted) {
          button.classList.add('active')
        }
        permissionRequests.getIcons(request).forEach(function (icon) {
          var i = document.createElement('i')
          i.className = 'fa ' + icon
          button.appendChild(i)
        })
        button.addEventListener('click', function (e) {
          e.stopPropagation()
          if (request.granted) {
            webviews.callAsync(tabId, 'reload')
          } else {
            permissionRequests.grantPermission(request.permissionId)
            button.classList.add('active')
          }
        })
        buttons.push(button)
      }
    })
    return buttons
  },
  onChange: function (listener) {
    permissionRequests.listeners.push(listener)
  },
  initialize: function () {
    ipc.on('updatePermissions', function (e, data) {
      var oldData = permissionRequests.requests
      permissionRequests.requests = data
      oldData.forEach(function (req) {
        permissionRequests.listeners.forEach(listener => listener(req.tabId))
      })
      permissionRequests.requests.forEach(function (req) {
        permissionRequests.listeners.forEach(listener => listener(req.tabId))
      })
    })
  }
}

permissionRequests.initialize()

module.exports = permissionRequests
