var container = document.getElementById("privacy-settings-container");
var trackerCheckbox = document.getElementById("checkbox-block-trackers");
var banner = document.getElementById("restart-required-banner");

function showRestartRequiredBanner() {
	banner.hidden = false;
}

var contentTypes = {
	//humanReadableName: contentType
	"scripts": "script",
	"images": "image",
};

settings.get('keyMap', function (keyMapSettings) {
	keyMap = userKeyMap(keyMapSettings);

	Object.keys(keyMap).forEach(createKeyMapInput);
});

function createKeyMapInput(action) {
	var keyMapList = document.getElementById('key-map-list');
	var key = keyMap[action];
	var li = document.createElement('li');
	var label = document.createElement('label');
	var input = document.createElement('input');
	label.innerText = formatCamelCase(action);
	label.htmlFor = action;

	input.type = "text";
	input.id = input.name = action;
	input.value = key;
	input.addEventListener('change', onKeyMapChange);

	li.appendChild(label);
	li.appendChild(input);
	keyMapList.appendChild(li);
}

function formatCamelCase(text) {
	var result = text.replace( /([A-Z])/g, " $1" );
	return result.charAt(0).toUpperCase() + result.slice(1);
}

function onKeyMapChange(e) {
	var action = this.name;
	var newKeyMap = this.value;

	keyMap[action] = parseKeyInput(newKeyMap);
	settings.set('keyMap', keyMap, function () {
		banner.hidden = false;
	});
}

function parseKeyInput(input) {
	//input may be a single mapping or multiple mappings comma separated.
	var parsed = input.split(',');
	parsed = parsed.map(function (e) { return e.trim();});
	//Remove empty
	parsed = parsed.filter(Boolean);
	return parsed.length > 1 ? parsed : parsed[0];
}

for (var contentType in contentTypes) {

	(function (contentType) {

		settings.get("filtering", function (value) {

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
				settings.get("filtering", function (value) {
					if (!value) {
						value = {};
					}
					if (!value.contentTypes) {
						value.contentTypes = [];
					}

					if (e.target.checked) { //add the item to the array
						value.contentTypes.push(contentTypes[contentType]);
					} else { //remove the item from the array
						var idx = value.contentTypes.indexOf(contentTypes[contentType]);
						value.contentTypes.splice(idx, 1);
					}

					settings.set("filtering", value);
					banner.hidden = false;
				});
			});

		});

	})(contentType);

}

settings.get("filtering", function (value) {
	trackerCheckbox.checked = value.trackers;
});

trackerCheckbox.addEventListener("change", function (e) {
	settings.get("filtering", function (value) {
		if (!value) {
			value = {};
		}
		value.trackers = e.target.checked;
		settings.set("filtering", value);
		banner.hidden = false;
	});
});

/* default search engine setting */

var searchEngineDropdown = document.getElementById("default-search-engine");

settings.onLoad(function () {

	for (var searchEngine in searchEngines) {

		var item = document.createElement("option");
		item.textContent = searchEngines[searchEngine].name;

		if (searchEngines[searchEngine].name == currentSearchEngine.name) {
			item.setAttribute("selected", "true");
		}

		searchEngineDropdown.appendChild(item);

	}

});

searchEngineDropdown.addEventListener("change", function (e) {
	settings.set("searchEngine", this.value);
	showRestartRequiredBanner();
});
