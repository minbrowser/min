function getColor(url, callback) {

	colorExtractorImage.onload = function (e) {
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d");

		var w = colorExtractorImage.width,
			h = colorExtractorImage.height;
		canvas.width = w
		canvas.height = h

		var offset = Math.max(1, Math.round(0.00032 * w * h));

		context.drawImage(colorExtractorImage, 0, 0, w, h);

		var data = context.getImageData(0, 0, w, h).data;

		var pixels = {};

		var d, add, sum;

		for (var i = 0; i < data.length; i += 4 * offset) {
			d = Math.round(data[i] / 5) * 5 + "," + Math.round(data[i + 1] / 5) * 5 + "," + Math.round(data[i + 2] / 5) * 5;

			add = 1;
			sum = data[i] + data[i + 1] + data[i + 2]

			//very dark or light pixels shouldn't be counted as heavily
			if (sum < 310) {
				add = 0.35;
			}

			if (data[i] > 210 || data[i + 1] > 210 || data[i + 2] > 210) {
				add = 0.5 - (0.0001 * sum)
			}

			if (pixels[d]) {
				pixels[d] = pixels[d] + add;
			} else {
				pixels[d] = add;
			}
		}

		//find the largest pixel set
		var largestPixelSet = null;
		var ct = 0;

		for (var k in pixels) {
			if (k == "255,255,255" || k == "0,0,0") {
				pixels[k] *= 0.05;
			}
			if (pixels[k] > ct) {
				largestPixelSet = k;
				ct = pixels[k];
			}
		}

		var res = largestPixelSet.split(",");

		for (var i = 0; i < res.length; i++) {
			res[i] = parseInt(res[i]);
		}

		callback(res);

	}

	colorExtractorImage.src = url;
}

var colorExtractorImage = document.createElement("img");

const defaultColors = {
	private: ["rgb(58, 44, 99)", "white"],
	regular: ["rgb(255, 255, 255)", "black"]
}

var hours = new Date().getHours() + (new Date().getMinutes() / 60);

//we cache the hours so we don't have to query every time we change the color

setInterval(function () {
	var d = new Date();
	hours = d.getHours() + (d.getMinutes() / 60);
}, 4 * 60 * 1000);

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
	requestIdleCallback(function () {
		getColor(favicons[0], function (c) {

			//dim the colors late at night or early in the morning
			var colorChange = 1;
			if (hours > 20) {
				colorChange -= 0.015 * Math.pow(2.75, hours - 20);
			} else if (hours < 6.5) {
				colorChange -= -0.15 * Math.pow(1.36, hours) + 1.15
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
	}, {
		timeout: 1000
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
