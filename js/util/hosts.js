var hosts = []

var HOSTS_FILE = process.platform === 'win32'
  ? 'C:/Windows/System32/drivers/etc/hosts'
  : '/etc/hosts'

function truncatedHostsFileLines (data, limit) {
  return data.length > limit
    ? data.substring(0, limit).split('\n').slice(0, -1)
    : data.split('\n')
}

fs.readFile(HOSTS_FILE, 'utf8', function (err, data) {
  if (err) {
    console.warn('error retrieving hosts file', err)
    return
  }

  var hostsMap = {} // this is used to deduplicate the list

  const lines = truncatedHostsFileLines(data, Math.pow(1024, 2))

  lines.forEach(function (line) {
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
