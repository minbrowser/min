var container = document.getElementById("settings-container");
var trackerCheckbox = document.getElementById("checkbox-block-trackers");
var banner = document.getElementById("restart-required-banner");

var contentTypes = {
	//humanReadableName: contentType
	"scripts": "script",
	"images": "image",
}

for (var contentType in contentTypes) {

	(function (contentType) {

		getSetting("filtering", function (value) {

			//create the settings section for blocking each content type

			var section = document.createElement("div");
			section.classList.add("setting-section");

			var id = "checkbox-block-" + contentTypes[contentType];

			var checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.id = id;

			if (value && value.contentTypes) {
				checkbox.checked = value.contentTypes.indexOf(contentTypes[contentType]) != -1;
			}

			var label = document.createElement("label");
			label.setAttribute("for", id);
			label.textContent = " Block " + contentType;

			section.appendChild(checkbox);
			section.appendChild(label);

			container.appendChild(section);

			checkbox.addEventListener("change", function (e) {
				getSetting("filtering", function (value) {
					if (!value) {
						value = {};
					}
					if (!value.contentTypes) {
						value.contentTypes = [];
					}

					if (e.target.checked) { //add the item to the array
						value.contentTypes.push(contentTypes[contentType]);
						console.log(true, value);
					} else { //remove the item from the array
						var idx = value.contentTypes.indexOf(contentTypes[contentType]);
						value.contentTypes.splice(idx, 1);
						console.log(false, value);
					}

					setSetting("filtering", value);
					banner.hidden = false;
				});
			});

		});

	})(contentType);

}

function getSetting(key, cb) {
	db.settings.where("key").equals(key).first(function (item) {
		if (item) {
			cb(item.value);
		} else {
			cb(null);
		}
	});
}

function setSetting(key, value, cb) {
	db.settings.put({
		key: key,
		value: value
	}).then(function () {
		if (cb) {
			cb();
		}
	});
}

getSetting("filtering", function (value) {
	trackerCheckbox.checked = value.trackers;
});

trackerCheckbox.addEventListener("change", function (e) {
	getSetting("filtering", function (value) {
		if (!value) {
			value = {};
		}
		value.trackers = e.target.checked;
		setSetting("filtering", value);
		banner.hidden = false;
	});
});
