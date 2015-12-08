var cf = new ColorThief();
var hours = new Date().getHours() + (new Date().getMinutes() / 60);
var colorExtractorImg = document.createElement("img");

//we cache the hours so we don't have to query every time we change the color

setInterval(function () {
	hours = new Date().getHours() + (new Date().getMinutes() / 60);
}, 10 * 60 * 1000);

function extractColor(favicon, callback) {
	colorExtractorImg.src = favicon;
	colorExtractorImg.onload = function () {

		//workaround for colorThief throwing an error on entirely white favicons
		try {
			var color = cf.getColor(colorExtractorImg);
		} catch (e) {
			var color = [255, 255, 255];
		}
		callback(color);
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

		//dim the colors late at night or early in the morning
		var colorChange = 1;
		if (hours > 20) {
			colorChange -= 0.012 * hours;
		} else if (hours < 7) {
			colorChange -= 0.012 * (24 - hours);
		}

		c[0] = Math.round(c[0] * colorChange)
		c[1] = Math.round(c[1] * colorChange)
		c[2] = Math.round(c[2] * colorChange)


		var cr = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";

		var obj = {
			r: c[0] / 255,
			g: c[1] / 255,
			b: c[2] / 255,
		}

		var textclr = getTextColor(obj);

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

//generated using http://harthur.github.io/brain/
var getTextColor = function (bgColor) {
	var output = runNetwork(bgColor);
	if (output.black > .5) {
		return 'black';
	}
	return 'white';
}

var runNetwork = function anonymous(input
	/**/
) {
	var net = {
		"layers": [{
			"r": {},
			"g": {},
			"b": {}
		}, {
			"0": {
				"bias": 23.754294528362333,
				"weights": {
					"r": -9.164071534408635,
					"g": -23.39042212583149,
					"b": -6.141882230115919
				}
			},
			"1": {
				"bias": 1.0246367545353685,
				"weights": {
					"r": 0.1979499996014915,
					"g": -12.323452468849514,
					"b": 18.23294673275185
				}
			},
			"2": {
				"bias": 12.375896556781662,
				"weights": {
					"r": -7.113624260920017,
					"g": -2.010919862284879,
					"b": -11.041419679013966
				}
			}
		}, {
			"black": {
				"bias": 20.134564019110876,
				"weights": {
					"0": -19.035591267853714,
					"1": -11.208318873932066,
					"2": -10.439005826172572
				}
			}
		}],
		"outputLookup": true,
		"inputLookup": true
	};

	for (var i = 1; i < net.layers.length; i++) {
		var layer = net.layers[i];
		var output = {};

		for (var id in layer) {
			var node = layer[id];
			var sum = node.bias;

			for (var iid in node.weights) {
				sum += node.weights[iid] * input[iid];
			}
			output[id] = (1 / (1 + Math.exp(-sum)));
		}
		input = output;
	}
	return output;
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
