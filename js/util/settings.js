/* 
gets and sets settings
requires Dexie and util/database.js
*/

var settings = {
	loaded: false,
	list: {},
	get: function (key, cb) {
		if (settings.loaded) {
			cb(settings.list[key]);
		} else {
			db.settings.where("key").equals(key).first(function (item) {
				if (item) {
					cb(item.value);
				} else {
					cb(null);
				}
			});
		}
	},
	set: function (key, value, cb) {
		db.settings.put({
			key: key,
			value: value
		}).then(function () {
			settings.list[key] = value;
			if (cb) {
				cb();
			}
		});
	},
	delete: function (key, cb) {
		db.settings.where("key").equals(key).delete()
			.then(function () {
				delete settings.list[key];
				if (cb) {
					cb();
				}
			});
	},
	load: function () {
		db.settings.each(function (setting) {
			settings.list[setting.key] = setting.value;
		}).then(function () {
			settings.loaded = true;
		});
	}
}

settings.load();
