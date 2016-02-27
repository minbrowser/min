//gets the tracking settings and sends them to the main process

var setFilteringSettings = remote.getGlobal("setFilteringSettings");
var registerFiltering = remote.getGlobal("registerFiltering");

db.settings.where("key").equals("filtering").first(function (setting) { //this won't run if the setting hasn't been set
	setFilteringSettings(setting.value);
});
