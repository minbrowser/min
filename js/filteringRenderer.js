// gets the tracking settings and sends them to the main process

var setFilteringSettings = remote.getGlobal('setFilteringSettings')
var registerFiltering = remote.getGlobal('registerFiltering')

settings.get('filtering', setFilteringSettings)
