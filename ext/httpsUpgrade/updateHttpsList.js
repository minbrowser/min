/*
    downloads and parses the full list from tranco-list.eu in order to get the
    top sites available for HTTPS upgrade
*/
const https = require('https')
const fs = require('fs')

const limitTopSites = 1000
const filePath = __dirname + `/httpsTopSites.json`
const listURL  = 'https://tranco-list.eu/download/ZGPG/full'

function saveTopSites(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

let req = https.get(listURL, function(r){
  var data = '', done = false

  r.on('data', (d) => {
    // hacky way to avoid downloading the whole list (which is heavy)
    const rex = new RegExp(`^${limitTopSites},`, 'gm')

    data += d.toString()
    if (rex.test(d.toString())) {
      r.emit('end')
      return
    }
  })

  r.on('end', () => {
    let topSites = []

    data.split('\n').forEach((l) => {
      let [rank,site] = l.split(',')
      if (rank > limitTopSites)
        return
      topSites.push(site.replace(/[\n\r]/g, ''))
    })

    saveTopSites(filePath, topSites)
  })
}).on('error', (e) => { })
req.shouldKeepAlive = false
