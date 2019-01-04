// gets the tracking settings and sends them to the main process

settings.get('filtering', function (value) {
  // migrate from old settings (<v1.9.0)
  if (value && typeof value.trackers === 'boolean') {
    if (value.trackers === true) {
      value.blockingLevel = 2
    } else if (value.trackers === false) {
      value.blockingLevel = 0
    }
    delete value.trackers
    settings.set('filtering', value)
  }
  ipc.send('setFilteringSettings', value)
})

function registerFiltering (ses) {
  ipc.send('registerFiltering', ses)
}
