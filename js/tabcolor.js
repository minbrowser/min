var cf = new ColorThief();

function extractColor(favicon, callback) {
	var img = document.createElement("img");
	img.src = favicon;
	img.onload = function () {
		callback(cf.getColor(img));
	}
}

function updateTabColor(favicons, tabId) {

	//special color scheme for private tabs
	if (tabs.get(tabId).private == true) {
		tabs.update(tabId, {
			backgroundColor: "#3a2c63",
			foregroundColor: "white",
		})

		if (tabId == tabs.getSelected()) {
			setColor("#3a2c63", "white");
		}
		return;
	}
	extractColor(favicons[0], function (c) {
		var cr = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";

		var obj = {
			r: c[0],
			g: c[1],
			b: c[2],
		}

		var textclr = yiq(obj);

		console.log(obj, textclr);

		tabs.update(tabId, {
			backgroundColor: cr,
			foregroundColor: textclr,
		})

		if (tabId == tabs.getSelected()) {
			setColor(cr, textclr);
		}
		return;
	});
}

//https://github.com/harthur/brain
function yiq(clr) {
	var r = clr.r,
		g = clr.g,
		b = clr.b;
	var yiq = (r * 299 + g * 587 + b * 114) / 1000;
	return (yiq >= 128) ? 'black' : 'white';
}

function setColor(bg, fg) {
	$(".theme-background-color").css("background-color", bg);
	$(".theme-text-color").css("color", fg);
	if (fg == "white") {
		$(document.body).addClass("dark-theme");
	} else {
		$(document.body).removeClass("dark-theme");
	}
}
