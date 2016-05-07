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
