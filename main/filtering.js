var thingsToFilter = {
  trackers: false,
  contentTypes: [] // script, image
}

var filterContentTypes = thingsToFilter.contentTypes.length !== 0

var parser = require('./ext/abp-filter-parser-modified/abp-filter-parser.js')
var parsedFilterData = {}

function initFilterList () {
  var data = require('fs').readFile(__dirname + '/ext/filterLists/easylist+easyprivacy-noelementhiding.txt', 'utf8', function (err, data) {
    if (err) {
      return
    }

    // data = data.replace(/.*##.+\n/g, '') // remove element hiding rules

    parser.parse(data, parsedFilterData)
  })
}

function handleRequest (details, callback) {
  if (!(details.url.startsWith('http://') || details.url.startsWith('https://')) || details.resourceType === 'mainFrame') {
    callback({
      cancel: false,
      requestHeaders: details.requestHeaders
    })
    return
  }

  // block javascript and images if needed

  if (filterContentTypes) {
    for (var i = 0; i < thingsToFilter.contentTypes.length; i++) {
      if (details.resourceType === thingsToFilter.contentTypes[i]) {
        callback({
          cancel: true,
          requestHeaders: details.requestHeaders
        })
        return
      }
    }
  }

  if (details.webContentsId) {
    var domain = parser.getUrlHost(webContents.fromId(details.webContentsId).getURL())
  } else {
    var domain = undefined
  }

  if (thingsToFilter.trackers) {
    if (parser.matches(parsedFilterData, details.url, {
        domain: domain,
        elementType: details.resourceType
      })) {
      callback({
        cancel: true,
        requestHeaders: details.requestHeaders
      })
      return
    }
  }

  callback({
    cancel: false,
    requestHeaders: details.requestHeaders
  })
}

function setFilteringSettings (settings) {
  if (!settings) {
    settings = {}
  }

  if (settings.trackers && !thingsToFilter.trackers) { // we're enabling tracker filtering
    initFilterList()
  }

  thingsToFilter.contentTypes = settings.contentTypes || []
  thingsToFilter.trackers = settings.trackers || false

  filterContentTypes = thingsToFilter.contentTypes.length !== 0
}

function registerFiltering (ses) {
  if (ses) {
    ses = session.fromPartition(ses)
  } else {
    ses = session.defaultSession
  }

  ses.webRequest.onBeforeRequest(handleRequest)
}

ipc.on('setFilteringSettings', function (e, settings) {
  setFilteringSettings(settings)
})

ipc.on('registerFiltering', function (e, ses) {
  registerFiltering(ses)
})
