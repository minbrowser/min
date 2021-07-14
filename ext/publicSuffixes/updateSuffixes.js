/* downloads public list of suffixes maintained by Mozilla and community */
const punycode = require('punycode')
const https = require('https')
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '/public_suffix_list.json')
const listURL = 'https://publicsuffix.org/list/public_suffix_list.dat'

var listData = ''

https.get(listURL, function (r) {
  r.on('data', (d) => {
    listData += d
  })

  r.on('end', () => {
    var cleanData = []
    for (var line of listData.split('\n')) {
      if (line.length === 0 || line.startsWith('//') || line.startsWith('!') ||
        line.split('.').length > 2 || line.substr(0, 2) === '*.'
      ) {
        continue
      }
      line = punycode.toASCII(line)
      cleanData.push(`.${line}`)
    }

    fs.writeFileSync(filePath,
      JSON.stringify(
        cleanData.sort().sort((a, b) => a.length - b.length), null, 2
      ) + '\n')
  })
})
