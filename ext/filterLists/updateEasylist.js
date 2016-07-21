/* downloads the latest version of easyList and easyPrivacy, removes element hiding rules, and saves them to ext/filterLists/easylist+easyprivacy-noelementhiding.txt */

const https = require('https')
const fs = require('fs')

const filePath = __dirname + '/easylist+easyprivacy-noelementhiding.txt'

const easylistOptions = {
  hostname: 'easylist.to',
  port: 443,
  path: '/easylist/easylist.txt',
  method: 'GET'
}

const easyprivacyOptions = {
  hostname: 'easylist.to',
  port: 443,
  path: '/easylist/easyprivacy.txt',
  method: 'GET'
}

function makeRequest (options, callback) {
  var request = https.request(options, function (response) {
    response.setEncoding('utf8')

    var data = ''
    response.on('data', function (chunk) {
      data += chunk
    })

    response.on('end', function () {
      callback(data)
    })
  })
  request.end()
}

/* get the filter lists */

makeRequest(easylistOptions, function (easylist) {
  makeRequest(easyprivacyOptions, function (easyprivacy) {
    var data = easylist + easyprivacy

    data = data.replace(/.*##.+\n/g, '')

    fs.writeFile(filePath, data)
  })
})
