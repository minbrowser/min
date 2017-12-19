// gets the tracking settings and sends them to the main process

settings.get('filtering', function (settings) {
  ipc.send('setFilteringSettings', settings)
})

function registerFiltering (ses) {
  ipc.send('registerFiltering', ses)
}
