/* downloads public list of suffixes maintained by Mozilla and community */
const https = require('https')
const fs = require('fs')

const filePath = __dirname + `/public_suffix_list.json`
const listURL  = 'https://publicsuffix.org/list/public_suffix_list.dat'


var listData = ''

https.get(listURL, function(r){
  r.on('data', (d) => {
    listData += d
  })

  r.on('end', () => {
    cleanData = []
    for(line of listData.split('\n').sort()) {
      if(line.length === 0 || line.startsWith('//'))
        continue
      cleanData.push(line)
    }

    fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2))
  })
})
