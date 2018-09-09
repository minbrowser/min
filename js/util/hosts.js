var hosts = []

var HOSTS_FILE = process.platform === 'win32'
  ? 'C:/Windows/System32/drivers/etc/hosts'
  : '/etc/hosts'

fs.readFile(HOSTS_FILE, 'utf8', function (err, data) {
  if (err) {
    console.warn('error retrieving hosts file', err)
    return
  }

  var hostsMap = {} // this is used to deduplicate the list

  // truncate data to 1MB
  var truncationLimit = Math.pow(1024, 2)
  var isTruncated = false

  if (data.length > truncationLimit) {
    data = data.substring(0, truncationLimit)
    isTruncated = true
  }

  data = data.split('\n')

  if (isTruncated) { // if the data is truncated the last line won't be complete
    data = data.slice(0, -1)
  }

  data.forEach(function (line) {
    if (line.startsWith('#')) {
      return
    }
    line.split(/\s/g).forEach(function (host) {
      if (host.length > 0 && host !== '255.255.255.255' && host !== 'broadcasthost' && !hostsMap[host]) {
        hosts.push(host)
        hostsMap[host] = true
      }
    })
  })
})

module.exports = hosts
