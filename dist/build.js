/* implements selecting webviews, switching between them, and creating new ones. */

var phishingWarningPage = "file://" + __dirname + "/pages/phishing/index.html"; //TODO move this somewhere that actually makes sense

var webviewBase = $("#webviews");
var webviewEvents = [];
var webviewIPC = [];

function updateURLInternal(webview, url) {
	webview.attr("src", url);
}

//this only affects newly created webviews, so all bindings should be done on startup

function bindWebviewEvent(event, fn) {
	webviewEvents.push({
		event: event,
		fn: fn,
	})
}

//function is called with (webview, tabId, IPCArguements)

function bindWebviewIPC(name, fn) {
	webviewIPC.push({
		name: name,
		fn: fn,
	})
}

function getWebviewDom(options) {

	var url = (options || {}).url || "about:blank";

	var w = $("<webview>");
	w.attr("preload", "dist/webview.min.js");
	w.attr("src", urlParser.parse(url));

	w.attr("data-tab", options.tabId);

	//if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
	//since tab IDs are unique, we can use them as partition names
	if (tabs.get(options.tabId).private == true) {
		w.attr("partition", options.tabId);
	}

	//webview events

	webviewEvents.forEach(function (i) {
		w.on(i.event, i.fn);
	})

	w.on("page-favicon-updated", function (e) {
		var id = $(this).attr("data-tab");
		updateTabColor(e.originalEvent.favicons, id);
	});

	w.on("page-title-set", function (e) {
		var tab = $(this).attr("data-tab");
		tabs.update(tab, {
			title: e.originalEvent.title
		});
		rerenderTabElement(tab);
	});

	w.on("did-finish-load", function (e) {
		var tab = $(this).attr("data-tab");
		var url = e.target.getURL();

		if (url.indexOf("https://") === 0) {
			tabs.update(tab, {
				secure: true,
				url: url,
			});
		} else {
			tabs.update(tab, {
				secure: false,
				url: url,
			});
		}

		if (tabs.get(tab).private == false) { //don't save to history if in private mode
			bookmarks.updateHistory(tab);
		}

		rerenderTabElement(tab);

		this.send("loadfinish"); //works around an electron bug (https://github.com/atom/electron/issues/1117), forcing Chromium to always  create the script context

	});

	/*w.on("did-get-redirect-request", function (e) {
		console.log(e.originalEvent);
	});*/


	/* too buggy, disabled for now

	w.on("did-fail-load", function (e) {
		if (e.originalEvent.validatedURL == this.getURL()) {
			updateURLInternal($(this), "file:///" + __dirname + "/pages/error/index.html?e=" + JSON.stringify(e.originalEvent) + "&url=" + $(this)[0].getURL());
		}
	});
		
	*/


	//open links in new tabs

	w.on("new-window", function (e) {
		var tab = $(this).attr("data-tab");
		var newTab = tabs.add({
			url: e.originalEvent.url,
			private: tabs.get(tab).private //inherit private status from the current tab
		})
		addTab(newTab, {
			focus: false,
			openInBackground: e.originalEvent.disposition == "background-tab", //possibly open in background based on disposition
		});
	});


	// In embedder page. Send the text content to bookmarks when recieved.
	w.on('ipc-message', function (e) {
		var w = this;
		var tab = $(this).attr("data-tab");

		webviewIPC.forEach(function (item) {
			if (item.name == e.originalEvent.channel) {
				item.fn(w, tab, e.originalEvent.args);
			}
		});

		if (e.originalEvent.channel == "bookmarksData") {
			bookmarks.onDataRecieved(e.originalEvent.args[0]);

		} else if (e.originalEvent.channel == "phishingDetected") {
			navigate($(this).attr("data-tab"), phishingWarningPage);
		}
	});

	w.on("contextmenu", webviewMenu.show);

	return w;

}

/* options: openInBackground: should the webview be opened without switching to it? default is false. 
 */

var WebviewsWithHiddenClass = false;

function addWebview(tabId, options) {
	options = options || {}; //fallback if options is undefined

	var tabData = tabs.get(tabId);

	var webview = getWebviewDom({
		tabId: tabId,
		url: tabData.url
	});

	webviewBase.append(webview);

	if (!options.openInBackground) {
		switchToWebview(tabId);
	} else {
		//this is used to hide the webview while still letting it load in the background
		webview.addClass("hidden");
	}
}

function switchToWebview(id) {
	$("webview").hide();
	$("webview[data-tab={id}]".replace("{id}", id)).removeClass("hidden").show().get(0).focus(); //in some cases, webviews had the hidden class instead of display:none to make them load in the background. We need to make sure to remove that.
}

function updateWebview(id, url) {
	var w = $("webview[data-tab={id}]".replace("{id}", id));

	w.attr("src", urlParser.parse(url));
}

function destroyWebview(id) {
	$("webview[data-tab={id}]".replace("{id}", id)).remove();
}

function getWebview(id) {
	return $("webview[data-tab={id}]".replace("{id}", id));
}
;/*
steps to creating a bookmark:

 - bookmarks.bookmark(tabId) is called
 - webview_preload.js sends an ipc to webviews.js
 - webviews.js detects the channel is "bookmarksData", and calls bookmarks.onDataRecieved(data)
 - The worker creates a bookmark, and adds it to the search index

*/

var bookmarks = {
	authBookmarkTab: null,
	updateHistory: function (tabId) {
		var w = getWebview(tabId)[0]
		var data = {
			url: w.getURL(),
			title: w.getTitle(),
			color: tabs.get(tabId).backgroundColor
		}
		bookmarks.worker.postMessage({
			action: "updateHistory",
			data: data
		})
	},
	currentCallback: function () {},
	onDataRecieved: function (data) {
		//we can't trust that the data we get from webview_preload.js isn't malicious. Because of this, when we call bookmarks.bookmark(), we set authBookmarkTab to the bookmarked tab id. Then, we check if the url we get back actually matches the url of the tabtab we want to bookmark. This way, we know that the user actually wants to bookmark this url.
		if (!bookmarks.authBookmarkTab || getWebview(bookmarks.authBookmarkTab)[0].getURL() != data.url) {
			throw new Error("Bookmark operation is unauthoritized.");
		}

		data.title = getWebview(bookmarks.authBookmarkTab)[0].getTitle();
		bookmarks.worker.postMessage({
			action: "addBookmark",
			data: data
		})
		bookmarks.authBookmarkTab = null;
	},
	delete: function (url) {
		bookmarks.worker.postMessage({
			action: "deleteBookmark",
			data: {
				url: url
			}
		});
	},
	search: function (text, callback) {
		bookmarks.currentCallback = callback; //save for later, we run in onMessage
		bookmarks.worker.postMessage({
			action: "searchBookmarks",
			text: text,
		});
	},
	searchHistory: function (text, callback) {
		bookmarks.currentHistoryCallback = callback; //save for later, we run in onMessage
		bookmarks.worker.postMessage({
			action: "searchHistory",
			text: text,
		});
	},
	searchTopics: function (text, callback) {
		bookmarks.currentTopicsCallback = callback;
		bookmarks.worker.postMessage({
			action: "searchTopics",
			text: text,
		});
	},
	onMessage: function (e) { //assumes this is from a search operation
		if (e.data.scope == "bookmarks") {
			//TODO this (and the rest) should use unique callback id's
			bookmarks.currentCallback(e.data.result);
		} else if (e.data.scope == "history") { //history search
			bookmarks.currentHistoryCallback(e.data.result);
		} else if (e.data.scope == "topics") {
			bookmarks.currentTopicsCallback(e.data.result);
		}
	},
	bookmark: function (tabId) {

		bookmarks.authBookmarkTab = tabId;
		getWebview(tabId)[0].send("sendData");
		//rest happens in onDataRecieved and worker
	},
	toggleBookmarked: function (tabId) { //toggles a bookmark. If it is bookmarked, delete the bookmark. Otherwise, add it.
		var url = tabs.get(tabId).url,
			exists = false;

		bookmarks.search(url, function (d) {

			d.forEach(function (item) {
				if (item.url == url) {
					exists = true;
				}
			});


			if (exists) {
				console.log("deleting bookmark " + tabs.get(tabId).url);
				bookmarks.delete(tabs.get(tabId).url);
			} else {
				bookmarks.bookmark(tabId);
			}
		});
	},
	getStar: function (tabId) {
		//alternative icon is fa-bookmark

		var star = $("<i class='fa fa-star-o bookmarks-button theme-text-color'>").attr("data-tab", tabId);

		star.on("click", function (e) {
			$(this).toggleClass("fa-star").toggleClass("fa-star-o");

			bookmarks.toggleBookmarked($(this).attr("data-tab"));
		});

		return bookmarks.renderStar(tabId, star);
	},
	renderStar: function (tabId, star) { //star is optional
		star = star || $(".bookmarks-button[data-tab={id}]".replace("{id}", tabId));

		try {
			var currentURL = getWebview(tabId)[0].getURL();
		} catch (e) {
			var currentURL = tabs.get(tabId).url;
		}

		if (!currentURL || currentURL == "about:blank") { //no url, can't be bookmarked
			star.prop("hidden", true);
		} else {
			star.prop("hidden", false);
		}

		//check if the page is bookmarked or not, and update the star to match

		bookmarks.search(currentURL, function (results) {
			if (results && results[0] && results[0].url == currentURL) {
				star.removeClass("fa-star-o").addClass("fa-star");
			} else {
				star.removeClass("fa-star").addClass("fa-star-o");
			}
		});
		return star;
	},
	init: function () {
		bookmarks.worker = new Worker("js/historyworker.js");
		bookmarks.worker.onmessage = bookmarks.onMessage;
	},

}

bookmarks.init();
;/*!
 * Color Thief v2.0
 * by Lokesh Dhakar - http://www.lokeshdhakar.com
 *
 * Thanks
 * ------
 * Nick Rabinowitz - For creating quantize.js.
 * John Schulz - For clean up and optimization. @JFSIII
 * Nathan Spady - For adding drag and drop support to the demo page.
 *
 * License
 * -------
 * Copyright 2011, 2015 Lokesh Dhakar
 * Released under the MIT license
 * https://raw.githubusercontent.com/lokesh/color-thief/master/LICENSE
 *
 */


/*
  CanvasImage Class
  Class that wraps the html image element and canvas.
  It also simplifies some of the canvas context manipulation
  with a set of helper functions.
*/
var CanvasImage = function (image) {
    this.canvas  = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    document.body.appendChild(this.canvas);

    this.width  = this.canvas.width  = image.width;
    this.height = this.canvas.height = image.height;

    this.context.drawImage(image, 0, 0, this.width, this.height);
};

CanvasImage.prototype.clear = function () {
    this.context.clearRect(0, 0, this.width, this.height);
};

CanvasImage.prototype.update = function (imageData) {
    this.context.putImageData(imageData, 0, 0);
};

CanvasImage.prototype.getPixelCount = function () {
    return this.width * this.height;
};

CanvasImage.prototype.getImageData = function () {
    return this.context.getImageData(0, 0, this.width, this.height);
};

CanvasImage.prototype.removeCanvas = function () {
    this.canvas.parentNode.removeChild(this.canvas);
};


var ColorThief = function () {};

/*
 * getColor(sourceImage[, quality])
 * returns {r: num, g: num, b: num}
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar
 * colors and return the base color from the largest cluster.
 *
 * Quality is an optional argument. It needs to be an integer. 1 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster a color will be returned but the greater the likelihood that it will not be the visually
 * most dominant color.
 *
 * */
ColorThief.prototype.getColor = function(sourceImage, quality) {
    var palette       = this.getPalette(sourceImage, 5, quality);
    var dominantColor = palette[0];
    return dominantColor;
};


/*
 * getPalette(sourceImage[, colorCount, quality])
 * returns array[ {r: num, g: num, b: num}, {r: num, g: num, b: num}, ...]
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar colors.
 *
 * colorCount determines the size of the palette; the number of colors returned. If not set, it
 * defaults to 10.
 *
 * BUGGY: Function does not always return the requested amount of colors. It can be +/- 2.
 *
 * quality is an optional argument. It needs to be an integer. 1 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster the palette generation but the greater the likelihood that colors will be missed.
 *
 *
 */
ColorThief.prototype.getPalette = function(sourceImage, colorCount, quality) {

    if (typeof colorCount === 'undefined') {
        colorCount = 10;
    }
    if (typeof quality === 'undefined' || quality < 1) {
        quality = 10;
    }

    // Create custom CanvasImage object
    var image      = new CanvasImage(sourceImage);
    var imageData  = image.getImageData();
    var pixels     = imageData.data;
    var pixelCount = image.getPixelCount();

    // Store the RGB values in an array format suitable for quantize function
    var pixelArray = [];
    for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
        offset = i * 4;
        r = pixels[offset + 0];
        g = pixels[offset + 1];
        b = pixels[offset + 2];
        a = pixels[offset + 3];
        // If pixel is mostly opaque and not white
        if (a >= 125) {
            if (!(r > 250 && g > 250 && b > 250)) {
                pixelArray.push([r, g, b]);
            }
        }
    }

    // Send array to quantize function which clusters values
    // using median cut algorithm
    var cmap    = MMCQ.quantize(pixelArray, colorCount);
    var palette = cmap? cmap.palette() : null;

    // Clean up
    image.removeCanvas();

    return palette;
};




/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 */

// fill out a couple protovis dependencies
/*!
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 */
if (!pv) {
    var pv = {
        map: function(array, f) {
          var o = {};
          return f ? array.map(function(d, i) { o.index = i; return f.call(o, d); }) : array.slice();
        },
        naturalOrder: function(a, b) {
            return (a < b) ? -1 : ((a > b) ? 1 : 0);
        },
        sum: function(array, f) {
          var o = {};
          return array.reduce(f ? function(p, d, i) { o.index = i; return p + f.call(o, d); } : function(p, d) { return p + d; }, 0);
        },
        max: function(array, f) {
          return Math.max.apply(null, f ? pv.map(array, f) : array);
        }
    };
}



/**
 * Basic Javascript port of the MMCQ (modified median cut quantization)
 * algorithm from the Leptonica library (http://www.leptonica.com/).
 * Returns a color map you can use to map original pixels to the reduced
 * palette. Still a work in progress.
 *
 * @author Nick Rabinowitz
 * @example

// array of pixels as [R,G,B] arrays
var myPixels = [[190,197,190], [202,204,200], [207,214,210], [211,214,211], [205,207,207]
                // etc
                ];
var maxColors = 4;

var cmap = MMCQ.quantize(myPixels, maxColors);
var newPalette = cmap.palette();
var newPixels = myPixels.map(function(p) {
    return cmap.map(p);
});

 */
var MMCQ = (function() {
    // private constants
    var sigbits = 5,
        rshift = 8 - sigbits,
        maxIterations = 1000,
        fractByPopulations = 0.75;

    // get reduced-space color index for a pixel
    function getColorIndex(r, g, b) {
        return (r << (2 * sigbits)) + (g << sigbits) + b;
    }

    // Simple priority queue
    function PQueue(comparator) {
        var contents = [],
            sorted = false;

        function sort() {
            contents.sort(comparator);
            sorted = true;
        }

        return {
            push: function(o) {
                contents.push(o);
                sorted = false;
            },
            peek: function(index) {
                if (!sorted) sort();
                if (index===undefined) index = contents.length - 1;
                return contents[index];
            },
            pop: function() {
                if (!sorted) sort();
                return contents.pop();
            },
            size: function() {
                return contents.length;
            },
            map: function(f) {
                return contents.map(f);
            },
            debug: function() {
                if (!sorted) sort();
                return contents;
            }
        };
    }

    // 3d color space box
    function VBox(r1, r2, g1, g2, b1, b2, histo) {
        var vbox = this;
        vbox.r1 = r1;
        vbox.r2 = r2;
        vbox.g1 = g1;
        vbox.g2 = g2;
        vbox.b1 = b1;
        vbox.b2 = b2;
        vbox.histo = histo;
    }
    VBox.prototype = {
        volume: function(force) {
            var vbox = this;
            if (!vbox._volume || force) {
                vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
            }
            return vbox._volume;
        },
        count: function(force) {
            var vbox = this,
                histo = vbox.histo;
            if (!vbox._count_set || force) {
                var npix = 0,
                    i, j, k;
                for (i = vbox.r1; i <= vbox.r2; i++) {
                    for (j = vbox.g1; j <= vbox.g2; j++) {
                        for (k = vbox.b1; k <= vbox.b2; k++) {
                             index = getColorIndex(i,j,k);
                             npix += (histo[index] || 0);
                        }
                    }
                }
                vbox._count = npix;
                vbox._count_set = true;
            }
            return vbox._count;
        },
        copy: function() {
            var vbox = this;
            return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
        },
        avg: function(force) {
            var vbox = this,
                histo = vbox.histo;
            if (!vbox._avg || force) {
                var ntot = 0,
                    mult = 1 << (8 - sigbits),
                    rsum = 0,
                    gsum = 0,
                    bsum = 0,
                    hval,
                    i, j, k, histoindex;
                for (i = vbox.r1; i <= vbox.r2; i++) {
                    for (j = vbox.g1; j <= vbox.g2; j++) {
                        for (k = vbox.b1; k <= vbox.b2; k++) {
                             histoindex = getColorIndex(i,j,k);
                             hval = histo[histoindex] || 0;
                             ntot += hval;
                             rsum += (hval * (i + 0.5) * mult);
                             gsum += (hval * (j + 0.5) * mult);
                             bsum += (hval * (k + 0.5) * mult);
                        }
                    }
                }
                if (ntot) {
                    vbox._avg = [~~(rsum/ntot), ~~(gsum/ntot), ~~(bsum/ntot)];
                } else {
//                    console.log('empty box');
                    vbox._avg = [
                        ~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
                        ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
                        ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
                    ];
                }
            }
            return vbox._avg;
        },
        contains: function(pixel) {
            var vbox = this,
                rval = pixel[0] >> rshift;
                gval = pixel[1] >> rshift;
                bval = pixel[2] >> rshift;
            return (rval >= vbox.r1 && rval <= vbox.r2 &&
                    gval >= vbox.g1 && gval <= vbox.g2 &&
                    bval >= vbox.b1 && bval <= vbox.b2);
        }
    };

    // Color map
    function CMap() {
        this.vboxes = new PQueue(function(a,b) {
            return pv.naturalOrder(
                a.vbox.count()*a.vbox.volume(),
                b.vbox.count()*b.vbox.volume()
            );
        });
    }
    CMap.prototype = {
        push: function(vbox) {
            this.vboxes.push({
                vbox: vbox,
                color: vbox.avg()
            });
        },
        palette: function() {
            return this.vboxes.map(function(vb) { return vb.color; });
        },
        size: function() {
            return this.vboxes.size();
        },
        map: function(color) {
            var vboxes = this.vboxes;
            for (var i=0; i<vboxes.size(); i++) {
                if (vboxes.peek(i).vbox.contains(color)) {
                    return vboxes.peek(i).color;
                }
            }
            return this.nearest(color);
        },
        nearest: function(color) {
            var vboxes = this.vboxes,
                d1, d2, pColor;
            for (var i=0; i<vboxes.size(); i++) {
                d2 = Math.sqrt(
                    Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                    Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                    Math.pow(color[2] - vboxes.peek(i).color[2], 2)
                );
                if (d2 < d1 || d1 === undefined) {
                    d1 = d2;
                    pColor = vboxes.peek(i).color;
                }
            }
            return pColor;
        },
        forcebw: function() {
            // XXX: won't  work yet
            var vboxes = this.vboxes;
            vboxes.sort(function(a,b) { return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color));});

            // force darkest color to black if everything < 5
            var lowest = vboxes[0].color;
            if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5)
                vboxes[0].color = [0,0,0];

            // force lightest color to white if everything > 251
            var idx = vboxes.length-1,
                highest = vboxes[idx].color;
            if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251)
                vboxes[idx].color = [255,255,255];
        }
    };

    // histo (1-d array, giving the number of pixels in
    // each quantized region of color space), or null on error
    function getHisto(pixels) {
        var histosize = 1 << (3 * sigbits),
            histo = new Array(histosize),
            index, rval, gval, bval;
        pixels.forEach(function(pixel) {
            rval = pixel[0] >> rshift;
            gval = pixel[1] >> rshift;
            bval = pixel[2] >> rshift;
            index = getColorIndex(rval, gval, bval);
            histo[index] = (histo[index] || 0) + 1;
        });
        return histo;
    }

    function vboxFromPixels(pixels, histo) {
        var rmin=1000000, rmax=0,
            gmin=1000000, gmax=0,
            bmin=1000000, bmax=0,
            rval, gval, bval;
        // find min/max
        pixels.forEach(function(pixel) {
            rval = pixel[0] >> rshift;
            gval = pixel[1] >> rshift;
            bval = pixel[2] >> rshift;
            if (rval < rmin) rmin = rval;
            else if (rval > rmax) rmax = rval;
            if (gval < gmin) gmin = gval;
            else if (gval > gmax) gmax = gval;
            if (bval < bmin) bmin = bval;
            else if (bval > bmax)  bmax = bval;
        });
        return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
    }

    function medianCutApply(histo, vbox) {
        if (!vbox.count()) return;

        var rw = vbox.r2 - vbox.r1 + 1,
            gw = vbox.g2 - vbox.g1 + 1,
            bw = vbox.b2 - vbox.b1 + 1,
            maxw = pv.max([rw, gw, bw]);
        // only one pixel, no split
        if (vbox.count() == 1) {
            return [vbox.copy()];
        }
        /* Find the partial sum arrays along the selected axis. */
        var total = 0,
            partialsum = [],
            lookaheadsum = [],
            i, j, k, sum, index;
        if (maxw == rw) {
            for (i = vbox.r1; i <= vbox.r2; i++) {
                sum = 0;
                for (j = vbox.g1; j <= vbox.g2; j++) {
                    for (k = vbox.b1; k <= vbox.b2; k++) {
                        index = getColorIndex(i,j,k);
                        sum += (histo[index] || 0);
                    }
                }
                total += sum;
                partialsum[i] = total;
            }
        }
        else if (maxw == gw) {
            for (i = vbox.g1; i <= vbox.g2; i++) {
                sum = 0;
                for (j = vbox.r1; j <= vbox.r2; j++) {
                    for (k = vbox.b1; k <= vbox.b2; k++) {
                        index = getColorIndex(j,i,k);
                        sum += (histo[index] || 0);
                    }
                }
                total += sum;
                partialsum[i] = total;
            }
        }
        else {  /* maxw == bw */
            for (i = vbox.b1; i <= vbox.b2; i++) {
                sum = 0;
                for (j = vbox.r1; j <= vbox.r2; j++) {
                    for (k = vbox.g1; k <= vbox.g2; k++) {
                        index = getColorIndex(j,k,i);
                        sum += (histo[index] || 0);
                    }
                }
                total += sum;
                partialsum[i] = total;
            }
        }
        partialsum.forEach(function(d,i) {
            lookaheadsum[i] = total-d;
        });
        function doCut(color) {
            var dim1 = color + '1',
                dim2 = color + '2',
                left, right, vbox1, vbox2, d2, count2=0;
            for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
                if (partialsum[i] > total / 2) {
                    vbox1 = vbox.copy();
                    vbox2 = vbox.copy();
                    left = i - vbox[dim1];
                    right = vbox[dim2] - i;
                    if (left <= right)
                        d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                    else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                    // avoid 0-count boxes
                    while (!partialsum[d2]) d2++;
                    count2 = lookaheadsum[d2];
                    while (!count2 && partialsum[d2-1]) count2 = lookaheadsum[--d2];
                    // set dimensions
                    vbox1[dim2] = d2;
                    vbox2[dim1] = vbox1[dim2] + 1;
//                    console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
                    return [vbox1, vbox2];
                }
            }

        }
        // determine the cut planes
        return maxw == rw ? doCut('r') :
            maxw == gw ? doCut('g') :
            doCut('b');
    }

    function quantize(pixels, maxcolors) {
        // short-circuit
        if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
//            console.log('wrong number of maxcolors');
            return false;
        }

        // XXX: check color content and convert to grayscale if insufficient

        var histo = getHisto(pixels),
            histosize = 1 << (3 * sigbits);

        // check that we aren't below maxcolors already
        var nColors = 0;
        histo.forEach(function() { nColors++; });
        if (nColors <= maxcolors) {
            // XXX: generate the new colors from the histo and return
        }

        // get the beginning vbox from the colors
        var vbox = vboxFromPixels(pixels, histo),
            pq = new PQueue(function(a,b) { return pv.naturalOrder(a.count(), b.count()); });
        pq.push(vbox);

        // inner function to do the iteration
        function iter(lh, target) {
            var ncolors = 1,
                niters = 0,
                vbox;
            while (niters < maxIterations) {
                vbox = lh.pop();
                if (!vbox.count())  { /* just put it back */
                    lh.push(vbox);
                    niters++;
                    continue;
                }
                // do the cut
                var vboxes = medianCutApply(histo, vbox),
                    vbox1 = vboxes[0],
                    vbox2 = vboxes[1];

                if (!vbox1) {
//                    console.log("vbox1 not defined; shouldn't happen!");
                    return;
                }
                lh.push(vbox1);
                if (vbox2) {  /* vbox2 can be null */
                    lh.push(vbox2);
                    ncolors++;
                }
                if (ncolors >= target) return;
                if (niters++ > maxIterations) {
//                    console.log("infinite loop; perhaps too few pixels!");
                    return;
                }
            }
        }

        // first set of colors, sorted by population
        iter(pq, fractByPopulations * maxcolors);

        // Re-sort by the product of pixel occupancy times the size in color space.
        var pq2 = new PQueue(function(a,b) {
            return pv.naturalOrder(a.count()*a.volume(), b.count()*b.volume());
        });
        while (pq.size()) {
            pq2.push(pq.pop());
        }

        // next set - generate the median cuts using the (npix * vol) sorting.
        iter(pq2, maxcolors - pq2.size());

        // calculate the actual colors
        var cmap = new CMap();
        while (pq2.size()) {
            cmap.push(pq2.pop());
        }

        return cmap;
    }

    return {
        quantize: quantize
    };
})();
;var urlParser = {
	searchBaseURL: "https://duckduckgo.com/?q=%s",
	startingWWWRegex: /www\.(.+\..+\/)/g,
	trailingSlashRegex: /\/$/g,
	isURL: function (url) {
		return url.indexOf("http://") == 0 || url.indexOf("https://") == 0 || url.indexOf("file://") == 0 || url.indexOf("about:") == 0 || url.indexOf("chrome:") == 0 || url.indexOf("data:") == 0;
	},
	isSystemURL: function (url) {
		return url.indexOf("chrome") == 0 || url.indexOf("about:") == 0;
	},
	removeProtocol: function (url) {
		if (!urlParser.isURL(url)) {
			return url;
		}

		var withoutProtocol = url.replace("http://", "").replace("https://", "").replace("file://", ""); //chrome:, about:, data: protocols intentionally not removed

		if (withoutProtocol.indexOf("www.") == 0) {
			var final = withoutProtocol.replace("www.", "");
		} else {
			var final = withoutProtocol;
		}

		return final;
	},
	isURLMissingProtocol: function (url) {
		return url.indexOf(" ") == -1 && url.indexOf(".") > 0;
	},
	parse: function (url) {
		url = url.trim(); //remove whitespace common on copy-pasted url's

		if (!url) {
			return "";
		}
		//if the url starts with a (supported) protocol, do nothing
		if (urlParser.isURL(url)) {
			return url;
		}

		if (url.indexOf("view-source:") == 0) {
			var realURL = url.replace("view-source:", "");

			return "view-source:" + urlParser.parse(realURL);
		}

		//if the url doesn't have a space and has a ., assume it is a url without a protocol
		if (urlParser.isURLMissingProtocol(url)) {
			return "http://" + url;
		}
		//else, do a search
		return urlParser.searchBaseURL.replace("%s", encodeURIComponent(url));
	},
	prettyURL: function (url) {
		var urlOBJ = new URL(url);
		return (urlOBJ.hostname + urlOBJ.pathname.replace(urlParser.trailingSlashRegex, "")).replace(urlParser.startingWWWRegex, "$1");
	}
}
;var cf = new ColorThief();
var hours = new Date().getHours() + (new Date().getMinutes() / 60);

//we cache the hours so we don't have to query every time we change the color

setInterval(function () {
	hours = new Date().getHours() + (new Date().getMinutes() / 60);
}, 10 * 60 * 1000);

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
;var remote, Menu, MenuItem, clipboard;

var webviewMenu = {
	cache: {
		event: null,
		webview: null,
	},
	loadFromContextData: function (IPCdata) {

		var tab = tabs.get(tabs.getSelected());

		var event = webviewMenu.cache.event;

		var menu = new Menu();

		//if we have a link (an image source or an href)
		if (IPCdata.src) {

			//show what the item is

			if (IPCdata.src.length > 60) {
				var caption = IPCdata.src.substring(0, 60) + "..."
			} else {
				var caption = IPCdata.src;
			}

			menu.append(new MenuItem({
				label: caption,
				enabled: false,
			}));
			menu.append(new MenuItem({
				label: 'Open in New Tab',
				click: function () {
					var newTab = tabs.add({
						url: IPCdata.src,
						private: tab.private,
					})
					addTab(newTab, {
						focus: false,
					});
				}
			}));

			//if the current tab isn't private, we want to provide an option to open the link in a private tab

			if (!tab.private) {
				menu.append(new MenuItem({
					label: 'Open in New Private Tab',
					click: function () {
						var newTab = tabs.add({
							url: IPCdata.src,
							private: true,
						})
						addTab(newTab, {
							focus: false,
						});
					}
				}));
			}

			menu.append(new MenuItem({
				type: "separator"
			}));

			menu.append(new MenuItem({
				label: 'Copy link',
				click: function () {
					clipboard.writeText(IPCdata.src);
				}
			}));
		}

		if (IPCdata.selection) {
			menu.append(new MenuItem({
				label: 'Copy',
				click: function () {
					clipboard.writeText(IPCdata.selection);
				}
			}));

			menu.append(new MenuItem({
				type: "separator"
			}));

			menu.append(new MenuItem({
				label: 'Search with DuckDuckGo',
				click: function () {
					var newTab = tabs.add({
						url: "https://duckduckgo.com/?q=" + encodeURIComponent(IPCdata.selection),
						private: tab.private,
					})
					addTab(newTab, {
						focus: false,
					});
				}
			}));
		}

		if (IPCdata.image) {
			menu.append(new MenuItem({
				label: 'View image',
				click: function () {
					navigate(webviewMenu.cache.tab, IPCdata.image);
				}
			}));
		}


		menu.append(new MenuItem({
			label: 'Inspect Element',
			click: function () {
				webviewMenu.cache.webview.inspectElement(event.x, event.y);
			}
		}));

		menu.popup(remote.getCurrentWindow());
	},
	/* cxevent: a contextmenu event. Can be a jquery event or a regular event. */
	show: function (cxevent) {

		if (!remote) { //we lazyload remote, so if it isn't loaded yet, call require()
			remote = require('remote');
			Menu = remote.require('menu');
			MenuItem = remote.require('menu-item');
			clipboard = require("clipboard")
		}

		var event = cxevent.originalEvent || cxevent;
		webviewMenu.cache.event = event;

		var currentTab = tabs.getSelected();
		var webview = getWebview(currentTab)[0]

		webviewMenu.cache.tab = currentTab;
		webviewMenu.cache.webview = webview;

		webview.send("getContextData", {
			x: event.offsetX,
			y: event.offsetY,
		}); //some menu items require recieving data from the page
	}
}

bindWebviewIPC("contextData", function (webview, tabId, arguements) {
	webviewMenu.loadFromContextData(arguements[0]);
})
;/* common to webview, tabrenderer, etc */

function navigate(tabId, newURL) {
	newURL = urlParser.parse(newURL);

	console.log("navigated to " + newURL);

	tabs.update(tabId, {
		url: newURL
	});

	updateWebview(tabId, newURL);

	leaveTabEditMode({
		blur: true
	});
}


//options:
//switchToTab: whether to switch to another tab, or create a new one if there are no tabs left. Defaults to true

function destroyTab(id, options) {
	options = options || {};
	//focus the next tab, or the previous tab if this was the last tab
	var t = tabs.getIndex(id);
	var nextTab = tabs.getAtIndex(t + 1) || tabs.getAtIndex(t - 1);

	$(".tab-item[data-tab={id}]".replace("{id}", id)).remove(); //remove the actual tab element
	var t = tabs.destroy(id); //remove from state - returns the index of the destroyed tab
	destroyWebview(id); //remove the webview

	console.log(t);
	console.log(nextTab);

	//if there are no other tabs, create a new one
	if (options.switchToTab && !nextTab) {
		return addTab();
	} else if (options.switchToTab) {
		switchToTab(nextTab.id);
	}
}

/* switches to a tab - update the webview, state, tabstrip, etc. */

function switchToTab(id) {
	leaveTabEditMode();

	tabs.setSelected(id);
	switchToWebview(id);

	setActiveTabElement(id);

	var tabData = tabs.get(id);
	setColor(tabData.backgroundColor, tabData.foregroundColor);

	tabs.update(id, {
		lastActivity: new Date().getTime(),
	});
	tabActivity.refresh();
}
;var bangPlugins = {};

function showBangPlugins(text, input) {
	for (var key in bangPlugins) {
		bangPlugins[key](text, input);
	}
}

bangPlugins.wiktionary = function (text, input) {

	if (text.indexOf("!wiktionary") == 0 && !tabs.get(tabs.getSelected()).private) {
		var search = text.replace("!wiktionary", "");

		if (!text) {
			return;
		}

		getDictionaryInfo(search, "English", function (data) {

			topAnswerarea.html(""); //clear previous answers

			if (!data || !data.definitions || !data.definitions[0] || !data.definitions[0].meaning || text != input.val()) {
				return;
			}

			var item = $("<div class='result-item' tabindex='-1'>").text(data.title);
			$("<span class='description-block'>").text(data.definitions[0].meaning).appendTo(item);

			item.on("click", function (e) {
				var URL = "https://en.wiktionary.org/wiki/" + data.title;
				if (e.metaKey) {
					openURLInBackground(URL);

				} else {
					navigate(tabs.getSelected(), URL);
				}
			});

			item.appendTo(topAnswerarea);
		});
	}
}
;var DDGSearchURLRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	trailingSlashRegex = /\/$/g,
	plusRegex = /\+/g;

var shouldAutocompleteTitle;
var hasAutocompleted = false;

var cachedHistoryResults = [];
var maxHistoryResults = 4;

function awesomebarAutocomplete(text, input) {
	if (text == awesomebarCachedText && input[0].selectionStart != input[0].selectionEnd) { //if nothing has actually changed, don't try to autocomplete
		return;
	}
	//if we moved the selection, we don't want to autocomplete again
	if (didFireKeydownSelChange) {
		return;
	}
	for (var i = 0; i < cachedHistoryResults.length; i++) {
		if (autocompleteResultIfNeeded(input, cachedHistoryResults[i])) {
			hasAutocompleted = true;
		}
	}
}

function autocompleteResultIfNeeded(input, result) {

	DDGSearchURLRegex.lastIndex = 0;

	shouldAutocompleteTitle = DDGSearchURLRegex.test(result.url);

	if (shouldAutocompleteTitle) {
		result.title = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));
	}

	var text = getValue(input); //make sure the input hasn't changed between start and end of query

	var textWithoutProtocol = urlParser.removeProtocol(text),
		URLWithoutProtocol = urlParser.removeProtocol(result.url);

	if (textWithoutProtocol != text) {
		var hasProtocol = true;
	}
	var hasWWW = text.indexOf("www.") != -1

	if (textWithoutProtocol.indexOf("/") == -1) {
		var hasPath = false;
	} else {
		var hasPath = true;
	}

	var canAutocompleteURL = URLWithoutProtocol.indexOf(textWithoutProtocol) == 0 && !shouldAutocompleteTitle;


	if (autocompleteEnabled && shouldContinueAC && textWithoutProtocol && (canAutocompleteURL || (shouldAutocompleteTitle && result.title.indexOf(textWithoutProtocol) == 0))) { //the user has started to type the url
		if (shouldAutocompleteTitle) {
			var ac = result.title;
		} else {
			//figure out the right address component to autocomplete

			var withWWWset = ((hasWWW) ? result.url : result.url.replace("www.", ""))
			var ac = ((hasProtocol) ? withWWWset : URLWithoutProtocol);
			if (!hasPath && !urlParser.isSystemURL(withWWWset)) {
				//if there isn't a / character typed yet, we only want to autocomplete to the domain
				var a = document.createElement("a");
				a.href = withWWWset;
				ac = ((hasProtocol) ? a.protocol + "//" : "") + a.hostname;
			}
		}

		if (!ac) { //make sure we have something to autocomplete - this could not exist if we are using domain autocomplete and the ac string didn't have a hostname when processed
			return;
		}

		input.blur();
		input[0].value = ac;
		input[0].setSelectionRange(text.length, ac.length);
		input.focus(); //update cache
		awesomebarCachedText = input[0].value,
			shouldContinueAC = false;

		return true;
	}
	return false;
}

var showHistoryResults = throttle(function (text, input, maxItems) {

	if (!text) {
		return;
	}

	bookmarks.searchHistory(text, function (results) {

		maxItems = maxItems || maxHistoryResults;

		historyarea.html("");

		cachedHistoryResults = results;

		awesomebarAutocomplete(text, input);

		if (results.length < 20) { //if we have a lot of history results, don't show search suggestions
			limitSearchSuggestions(results.length);
			showSearchSuggestions(text, input);
		} else if (text.indexOf("!") == -1) { //if we have a !bang, always show results
			serarea.html("");
		}

		var resultsShown = 0;

		results.forEach(function (result) {

			//if there is a bookmark result found, don't show a history item

			if (bookmarkarea.find(".result-item[data-url='{url}']".replace("{url}", result.url.replace(/'/g, "")))[0]) {
				return;
			}

			var shouldAutocompleteTitle = false;

			var title = result.title;
			var icon = $("<i class='fa fa-globe'>");

			//special formatting for ddg search history results

			DDGSearchURLRegex.lastIndex = 0;

			if (DDGSearchURLRegex.test(result.url)) {
				//the history item is a search, display it like a search suggestion
				title = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));
				icon = $("<i class='fa fa-search'>");
				shouldAutocompleteTitle = true; //previous searches can be autocompleted
			}

			//if we've started typing the result and didn't press the delete key (which should make the highlight go away), autocomplete in the input


			var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(getRealTitle(title))).on("click", function (e) {
				//if the command key was pressed, open in background while still showing awesomebar

				if (e.metaKey) {
					openURLInBackground(result.url);

				} else {
					navigate(tabs.getSelected(), result.url);
				}
			});

			icon.prependTo(item);

			if (!shouldAutocompleteTitle && result.title != result.url) { //if we're autocompleting titles, this is a search, and we don't want to show the URL. If the item title and URL are the same (meaning the item has no title), there is no point in showing a URL since we are showing it in the title field.

				$("<span class='secondary-text'>").text(urlParser.prettyURL(result.url)).appendTo(item);
			}

			if (resultsShown >= maxItems) { //only show up to n history items
				item.hide().addClass("unfocusable");
			}

			item.appendTo(historyarea);


			resultsShown++;

		});
	});
}, 100);

function limitHistoryResults(maxItems) {
	maxHistoryResults = Math.min(4, Math.max(maxItems, 2));
	console.log("limiting maxHistoryResults to " + maxHistoryResults);
	historyarea.find(".result-item").show().removeClass("unfocusable");
	historyarea.find(".result-item:nth-child(n+{items})".replace("{items}", maxHistoryResults + 1)).hide().addClass("unfocusable");
}
;var showBookmarkResults = throttle(function (text) {
	if (text.length < 3) {
		limitHistoryResults(5);
		bookmarkarea.html("");
		return;
	}

	bookmarks.search(text, function (results) {
		bookmarkarea.html("");
		var resultsShown = 1;
		results.splice(0, 2).forEach(function (result) {
			//as more results are added, the threshold for adding another one gets higher
			if (result.score > Math.max(0.0004, 0.0016 - (0.00012 * Math.pow(1.3, text.length) * resultsShown))) {

				resultsShown++;

				//create the basic item
				//getRealTitle is defined in awesomebar.js
				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(getRealTitle(result.title))).on("click", function (e) {
					if (e.metaKey) {
						openURLInBackground(result.url);
					} else {
						navigate(tabs.getSelected(), result.url);
					}
				});

				$("<i class='fa fa-star'>").prependTo(item);

				var span = $("<span class='secondary-text'>").text(urlParser.prettyURL(result.url));


				if (result.extraData && result.extraData.metadata) {
					var captionSpans = [];

					if (result.extraData.metadata.rating) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.rating));
					}
					if (result.extraData.metadata.price) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.price));
					}
					if (result.extraData.metadata.location) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.location));
					}


					captionSpans.reverse().forEach(function (s) {
						span.prepend(s);
					})
				}


				span.appendTo(item);

				item.appendTo(bookmarkarea);

				item.attr("data-url", result.url);
			}

		});
		limitHistoryResults(5 - resultsShown); //if we have lots of bookmarks, don't show as many regular history items

	});
}, 400);
;var BANG_REGEX = /!\w+/g;
var serarea = $("#awesomebar .search-engine-results");
var iaarea = $("#awesomebar .instant-answer-results");
var topAnswerarea = $("#awesomebar .top-answer-results");
var suggestedsitearea = $("#awesomebar .ddg-site-results");

var maxSearchSuggestions = 5;

/* duckduckgo returns raw html for the color info ui. We need to format that */

function unsafe_showColorUI(searchText, colorHTML) {
	var el = $("<div>").html(colorHTML);
	var color = el.find(".colorcodesbox.circle").css("background");
	var alternateFormats = [];

	el.find(".no_vspace").each(function () {
		alternateFormats.push($(this).text());
	});

	var item = $("<div class='result-item' tabindex='-1'>");

	item.text(searchText);

	$("<div class='result-icon color-circle'>").css("background", color).prependTo(item);

	$("<span class='description-block'>").text(alternateFormats.join(" " + METADATA_SEPARATOR + " ")).appendTo(item);

	return item;
};

//this is triggered from history.js - we only show search suggestions if we don't have history results
window.showSearchSuggestions = throttle(function (text, input) {

	if (!text) {
		return;
	}

	//we don't show search suggestions in private tabs, since this would send typed text to DDG

	if (tabs.get(tabs.getSelected()).private) {
		return;
	}

	if (BANG_REGEX.test(text)) { //we're typing a bang
		var bang = text.match(BANG_REGEX)[0];

		var bangACSnippet = cachedBangSnippets[bang];

	}
	$.ajax("https://ac.duckduckgo.com/ac/?q=" + encodeURIComponent(text))
		.done(function (results) {

			serarea.find(".result-item").addClass("old");

			if (results && results[0] && results[0].snippet) { //!bang search - ddg api doesn't have a good way to detect this

				results.splice(0, 5).forEach(function (result) {
					cachedBangSnippets[result.phrase] = result.snippet;

					//autocomplete the bang, but allow the user to keep typing

					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.snippet)).on("click", function () {
						setTimeout(function () { //if the click was triggered by the keydown, focusing the input and then keyup will cause a navigation. Wait a bit for keyup before focusing the input again.
							input.val(result.phrase + " ").focus();
						}, 100);
					});

					$("<span class='secondary-text'>").text(result.phrase).appendTo(item);

					$("<img class='result-icon inline'>").attr("src", result.image).prependTo(item);

					item.appendTo(serarea);
				});

			} else if (results) {
				results = results.splice(0, maxSearchSuggestions);

				results.forEach(function (result) {
					var title = result.phrase;
					if (BANG_REGEX.test(result.phrase) && bangACSnippet) {
						title = result.phrase.replace(BANG_REGEX, "");
						var secondaryText = "Search on " + bangACSnippet;
					}
					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(title)).on("click", function (e) {
						if (e.metaKey) {
							openURLInBackground(result.phrase);
						} else {
							navigate(tabs.getSelected(), result.phrase);
						}
					});

					item.appendTo(serarea);

					if (urlParser.isURL(result.phrase) || urlParser.isURLMissingProtocol(result.phrase)) { //website suggestions
						$("<i class='fa fa-globe'>").prependTo(item);
					} else { //regular search results
						$("<i class='fa fa-search'>").prependTo(item);
					}

					if (secondaryText) {
						$("<span class='secondary-text'>").text(secondaryText).appendTo(item);
					}
				});
			}

			serarea.find(".old").remove();
		});

}, 500);

/* this is called from historySuggestions. When we find history results, we want to limit search suggestions to 2 so the awesomebar doesn't get too large. */

var limitSearchSuggestions = function (itemsToRemove) {
	var itemsLeft = Math.max(2, 5 - itemsToRemove);
	maxSearchSuggestions = itemsLeft;
	serarea.find(".result-item:nth-child(n+{items})".replace("{items}", itemsLeft + 1)).remove();
}

window.showInstantAnswers = throttle(function (text, input, options) {

	options = options || {};

	//don't make useless queries
	if (urlParser.isURLMissingProtocol(text)) {
		return;
	}

	//don't send typed text in private mode
	if (tabs.get(tabs.getSelected()).private) {
		return;
	}

	//instant answers

	iaarea.find(".result-item").addClass("old");
	suggestedsitearea.find(".result-item").addClass("old");
	topAnswerarea.find(".result-item").addClass("old");

	//run bang plugins. Putting this insides the answers call makes throttling and deletion of old answers simpler

	showBangPlugins(text, input);

	if (text.length > 3) {

		$.getJSON("https://api.duckduckgo.com/?skip_disambig=1&format=json&pretty=1&q=" + encodeURIComponent(text), function (res) {

			//if value has changed, don't show results
			if (text != getValue(input) && !options.alwaysShow) {
				return;
			}

			iaarea.find(".result-item").addClass("old");
			suggestedsitearea.find(".result-item").addClass("old");

			if (res.Abstract || res.Answer) {
				var item = $("<div class='result-item' tabindex='-1'>");

				if (res.Answer) {
					item.text(unsafeUnwrapTags(res.Answer));
				} else {
					item.text(res.Heading);
				}

				/*if (res.Image && res.Entity != "company" && res.Entity != "country" && res.Entity != "website") { //ignore images for entities that generally have useless or ugly images
					$("<img class='result-icon image'>").attr("src", res.Image).prependTo(item);
				}*/

				$("<span class='description-block'>").text(removeTags(res.Abstract) || "Answer").appendTo(item);

				//the parsing for this is different

				if (res.AnswerType == "color_code") {
					item = unsafe_showColorUI(text, res.Answer);
				}

				item.on("click", function (e) {
					if (e.metaKey) {
						openURLInBackground(res.AbstractURL || text);
					} else {
						navigate(tabs.getSelected(), res.AbstractURL || text)
					}
				});

				//answers are more relevant, they should be displayed at the top
				if (res.Answer) {
					item.appendTo(topAnswerarea);
				} else {
					item.appendTo(iaarea);
				}
			}

			//suggested site links

			if (res.Results && res.Results[0] && res.Results[0].FirstURL) {
				var url = urlParser.removeProtocol(res.Results[0].FirstURL).replace(trailingSlashRegex, "");

				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(url)).on("click", function (e) {

					if (e.metaKey) {
						openURLInBackground(res.Results[0].FirstURL);

					} else {
						navigate(tabs.getSelected(), res.Results[0].FirstURL);
					}
				});

				$("<i class='fa fa-globe'>").prependTo(item);

				$("<span class='secondary-text'>").text("Suggested site").appendTo(item);

				console.log(item);

				//if we have bookmarks for that item, we probably don't need to suggest a site
				if (bookmarkarea.find(".result-item").length < 2) {
					item.appendTo(suggestedsitearea);
				}
			}

			iaarea.find(".old").remove();
			suggestedsitearea.find(".old").remove();
			topAnswerarea.find(".old").remove();


		});
	} else {
		iaarea.find(".old").remove(); //we still want to remove old items, even if we didn't make a new request
		suggestedsitearea.find(".old").remove();
	}

}, 700);
;const maxTopicResults = 2;
const showTopicResults = function (text, input) {

	bookmarks.searchTopics(text, function (topics) {

		topicsarea.html("");

		if (!topics || !topics[0]) {
			return;
		}

		var topicsShown = 0;

		topics.forEach(function (topic) {
			if (topicsShown < maxTopicResults) {
				if (topic.name == text) {
					return;
				}
				$("<div class='result-item' tabindex='-1'>").text(topic.name).attr("title", "More results for this topic").prepend("<i class='fa fa-tag'></i>").appendTo(topicsarea).on("click", function (e) {

					//enter a special history-only mode

					clearAwesomebar();

					input.val(topic.name);

					showHistoryResults(topic.name, input, 50); //show up to 50 results.
					showBookmarkResults(topic.name);

					setTimeout(function () { //the item was focused on the keydown event. If we immediately focus the input, a keypress event will occur, causing an exit from edit mode
						input.focus();
					}, 100);
				});
				topicsShown++;
			}
		});


	});

}
;var spacesRegex = /[\s._/-]/g; //copied from historyworker.js

var stringScore = require("string_score");

var searchOpenTabs = function (searchText) {

	opentabarea.html("");

	if (searchText.length < 2) {
		return;
	}

	var matches = [],
		selTab = tabs.getSelected();

	tabs.get().forEach(function (item) {
		if (item.id == selTab || !item.title || item.url == "about:blank") {
			return;
		}

		item.url = urlParser.removeProtocol(item.url); //don't search protocols

		var exactMatch = item.title.indexOf(searchText) != -1 || item.url.indexOf(searchText) != -1
		var fuzzyMatch = item.title.substring(0, 50).score(searchText, 0.5) > 0.45 || item.url.score(searchText, 0.5) > 0.4;

		if (exactMatch || fuzzyMatch) {
			matches.push(item);
		}
	});

	matches.splice(0, 2).sort(function (a, b) {
		return b.title.score(searchText, 0.5) - a.title.score(searchText, 0.5);
	}).forEach(function (tab) {
		var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(tab.title))
		$("<span class='secondary-text'>").text(urlParser.removeProtocol(tab.url).replace(trailingSlashRegex, "")).appendTo(item);

		$("<i class='fa fa-external-link'>").attr("title", "Switch to Tab").prependTo(item); //TODO better icon

		item.on("click", function () {
			//if we created a new tab but are switching away from it, destroy the current (empty) tab
			if (tabs.get(tabs.getSelected()).url == "about:blank") {
				destroyTab(tabs.getSelected(), {
					switchToTab: false
				});
			}
			switchToTab(tab.id);
		});

		item.appendTo(opentabarea);
	});
}
;var awesomebarShown = false;
var awesomebarCachedText = "";
var cachedACItem = "";
var autocompleteEnabled = true;
var shouldContinueAC = true;
var METADATA_SEPARATOR = "·";
var didFireKeydownSelChange = false;
var currentAwesomebarInput;

//cache duckduckgo bangs so we make fewer network requests
var cachedBangSnippets = {};

//https://remysharp.com/2010/07/21/throttling-function-calls#

function throttle(fn, threshhold, scope) {
	threshhold || (threshhold = 250);
	var last,
		deferTimer;
	return function () {
		var context = scope || this;

		var now = +new Date,
			args = arguments;
		if (last && now < last + threshhold) {
			// hold on to it
			clearTimeout(deferTimer);
			deferTimer = setTimeout(function () {
				last = now;
				fn.apply(context, args);
			}, threshhold);
		} else {
			last = now;
			fn.apply(context, args);
		}
	};
}

function removeTags(text) {
	return text.replace(/<[\w\W]*>/g, "");
}

function unsafeUnwrapTags(text) {
	return $("<div>").html(text).text();
}

/* this is used by navbar-tabs.js. When a url is entered, endings such as ? need to be parsed and removed. */
function parseAwesomebarURL(url) {
	//always use a search engine if the query starts with "?"

	if (url.indexOf("?") == 0) {
		url = urlParser.searchBaseURL.replace("%s", encodeURIComponent(url.replace("?", "")));
	}

	if (url.indexOf("^") == 0) {
		url = url.replace("^", "");
	}

	if (url.indexOf("*") == 0) {
		url = url.replace("*", "");
	}

	return url;
}

function openURLInBackground(url) { //used to open a url in the background, without leaving the awesomebar
	var newTab = tabs.add({
		url: url,
		private: tabs.get(tabs.getSelected()).private
	})
	addTab(newTab, {
		focus: false,
		openInBackground: true,
		leaveEditMode: false,
	});
	$(".result-item:focus").blur(); //remove the highlight from an awesoembar result item, if there is one
}


//attempts to shorten a page title, removing useless text like the site name

function getRealTitle(text) {

	//don't try to parse URL's
	if (urlParser.isURL(text)) {
		return text;
	}

	var possibleCharacters = ["|", ":", " - ", " — "];

	for (var i = 0; i < possibleCharacters.length; i++) {

		var char = possibleCharacters[i];
		//match url's of pattern: title | website name
		var titleChunks = text.split(char);

		if (titleChunks.length >= 2) {
			titleChunks[0] = titleChunks[0].trim();
			titleChunks[1] = titleChunks[1].trim();

			if (titleChunks[1].length < 5 || titleChunks[1].length / titleChunks[0].length <= 0.5) {
				return titleChunks[0]
			}

			//match website name | title. This is less common, so it has a higher threshold

			if (titleChunks[0].length / titleChunks[1].length < 0.35) {
				return titleChunks[1]
			}
		}
	}

	//fallback to the regular title

	return text;
}

var awesomebar = $("#awesomebar");
var historyarea = awesomebar.find(".history-results");
var bookmarkarea = awesomebar.find(".bookmark-results");
var topicsarea = awesomebar.find(".topic-results");
var opentabarea = awesomebar.find(".opentab-results");

function clearAwesomebar() {
	opentabarea.html("");
	topAnswerarea.html("");
	bookmarkarea.html("");
	historyarea.html("");
	topicsarea.html("");
	iaarea.html("");
	suggestedsitearea.html("");
	serarea.html("");
}

function showAwesomebar(triggerInput) {
	awesomebarCachedText = triggerInput.val();
	awesomebarShown = true;
	$(document.body).addClass("awesomebar-shown");

	clearAwesomebar();


	awesomebar.show();

	currentAwesomebarInput = triggerInput;

}

//gets the typed text in an input, ignoring highlighted suggestions

function getValue(input) {
	var text = input.val();
	return text.replace(text.substring(input[0].selectionStart, input[0].selectionEnd), "");
}

function hideAwesomebar() {
	awesomebarShown = false;
	$(document.body).removeClass("awesomebar-shown");
	awesomebar.hide();
	cachedBangSnippets = {};
}
var showAwesomebarResults = throttle(function (text, input, event) {

	//find the real input value, accounting for highlighted suggestions and the key that was just pressed

	var v = input[0].value;

	//delete key doesn't behave like the others, String.fromCharCode returns an unprintable character (which has a length of one)

	if (event.keyCode != 8) {

		text = v.substring(0, input[0].selectionStart) + String.fromCharCode(event.keyCode) + v.substring(input[0].selectionEnd + 1, v.length).trim();

	} else {
		txt = v;
	}


	hasAutocompleted = false;

	shouldContinueAC = !(event.keyCode == 8); //this needs to be outside searchHistory so that it doesn't get reset if the history callback is run multiple times (such as when multiple messages get sent before the worker has finished startup).

	console.log("awesomebar: ", "'" + text + "'", text.length);

	//there is no text, show a blank awesomebar
	if (text.length < 1) {
		clearAwesomebar();
		return;
	}

	//when you start with ?, always search with duckduckgo

	if (text.indexOf("?") == 0) {
		clearAwesomebar();

		maxSearchSuggestions = 5;
		showSearchSuggestions(text.replace("?", ""), input);
		return;
	}

	//when you start with ^, always search history (only)

	if (text.indexOf("^") == 0) {
		clearAwesomebar();
		showHistoryResults(text.replace("^", ""), input);
		return;
	}

	//when you start with *, always search bookmarks (only)

	if (text.indexOf("*") == 0) {
		clearAwesomebar();
		showBookmarkResults(text.replace("*", ""), input);
		return;
	}

	//show awesomebar results


	//normally, we will search history first, and only show search suggestions if there aren't any history results. However, if the history db isn't opened yet (which it won't be if the page loaded less than a few seconds ago), we should show results without waiting for history. Also, show results if a !bang search is occuring
	if (performance.now() < 12500 || text.indexOf("!") == 0) {

		showSearchSuggestions(text, input);
	}

	showBookmarkResults(text);

	showHistoryResults(text, input);
	showInstantAnswers(text, input);
	showTopicResults(text, input);
	searchOpenTabs(text, input);

	//update cache
	awesomebarCachedText = text;
}, 25);

function focusAwesomebarItem(options) {
	options = options || {}; //fallback if options is null
	var previous = options.focusPrevious;
	var allItems = $("#awesomebar .result-item:not(.unfocusable)");
	var currentItem = $("#awesomebar .result-item:focus");
	var index = allItems.index(currentItem);
	var logicalNextItem = allItems.eq((previous) ? index - 1 : index + 1);


	if (currentItem[0] && logicalNextItem[0]) { //an item is focused and there is another item after it, move onto the next one
		logicalNextItem.get(0).focus();
	} else { // the last item is focused, or no item is focused. Focus the first one again.
		$("#awesomebar .result-item").first().get(0).focus();
	}
}

//return key on result items should trigger click 
//tab key or arrowdown key should focus next item
//arrowup key should focus previous item

awesomebar.on("keydown", ".result-item", function (e) {
	if (e.keyCode == 13) {
		$(this).trigger("click");
	} else if (e.keyCode == 9 || e.keyCode == 40) { //tab or arrowdown key
		e.preventDefault();
		focusAwesomebarItem();
	} else if (e.keyCode == 38) {
		e.preventDefault();
		focusAwesomebarItem({
			focusPrevious: true
		});
	}
});

//when we get keywords data from the page, we show those results in the awesomebar

bindWebviewIPC("keywordsData", function (webview, tabId, arguements) {

	var data = arguements[0];

	var hasShownDDGpopup = false;
	var itemsCt = 0;

	var itemsShown = [];


	data.entities.forEach(function (item, index) {

		//ignore one-word items, they're usually useless
		if (!/\s/g.test(item.trim())) {
			return;
		}

		if (itemsCt >= 5 || itemsShown.indexOf(item.trim()) != -1) {
			return;
		}

		if (!hasShownDDGpopup) {
			showInstantAnswers(data.entities[0], currentAwesomebarInput, {
				alwaysShow: true
			});

			hasShownDDGpopup = true;
		}

		var div = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(item)).on("click", function (e) {
			if (e.metaKey) {
				openURLInBackground(item);
			} else {
				navigate(tabs.getSelected(), item);
			}
		});

		$("<i class='fa fa-search'>").prependTo(div);

		div.appendTo(serarea);

		itemsCt++;
		itemsShown.push(item.trim());
	});
});
;var readerView = {
	getButton: function (tabId) {
		//TODO better icon
		return $("<i class='fa fa-align-left reader-button'>").attr("data-tab", tabId).attr("title", "Enter reader view");
	},
	updateButton: function (tabId) {
		var button = $(".reader-button[data-tab={id}]".replace("{id}", tabId));
		var tab = tabs.get(tabId);

		button.off();

		if (tab.isReaderView) {
			button.addClass("is-reader").attr("title", "Exit reader view");
			button.on("click", function (e) {
				e.stopPropagation();
				readerView.exit(tabId);
			});
			return;
		} else {
			button.removeClass("is-reader").attr("title", "Enter reader view");
		}

		if (tab.readerable) {
			button.addClass("can-reader");
			button.on("click", function (e) {
				e.stopPropagation();
				readerView.enter(tabId);
			});
		} else {
			button.removeClass("can-reader");
		}
	},
	enter: function (tabId) {
		navigate(tabId, "file:///" + __dirname + "/reader/index.html?url=" + tabs.get(tabId).url);
		tabs.update(tabId, {
			isReaderView: true
		})
	},
	exit: function (tabId) {
		navigate(tabId, tabs.get(tabId).url.split("?url=")[1]);
		tabs.update(tabId, {
			isReaderView: false
		})
	}
}

//update the reader button on page load

bindWebviewEvent("did-finish-load", function (e) {
	var tab = $(this).attr("data-tab"),
		url = this.getURL();

	if (url.indexOf("file://" + __dirname + "/reader/index.html") == 0) {
		tabs.update(tab, {
			isReaderView: true
		})
	} else {
		tabs.update(tab, {
			isReaderView: false
		})
	}

	//assume the new page can't be readered, we'll get another message if it can

	tabs.update(tab, {
		readerable: false,
	});
	readerView.updateButton(tab);

});

bindWebviewIPC("canReader", function (webview, tab) {
	tabs.update(tab, {
		readerable: true
	});
	readerView.updateButton(tab);
});
;/* tracks the state of tabs */

// Array Remove - By John Resig (MIT Licensed)
//http://stackoverflow.com/a/9815010/4603285
Array.prototype.remove = function (from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

var tabs = {
	_state: {
		tabs: [],
		selected: null,
	},
	add: function (tab) {

		//make sure the tab exists before we create it
		if (!tab) {
			throw new TypeError("tab is not defined.")
		}

		tab.url = tab.url || "";

		var tabId = tab.id || Math.round(Math.random() * 100000000000000000); //you can pass an id that will be used, or a random one will be generated.


		tabs._state.tabs.push({
			url: tab.url,
			title: tab.title,
			id: tabId,
			lastActivity: new Date().getTime(),
			secure: false,
			private: tab.private || false,
			readerable: tab.readerable || false,
			backgroundColor: tab.backgroundColor,
			foregroundColor: tab.foregroundColor,
		});

		return tabId;

	},
	update: function (id, data) {
		if (!tabs.get(id)) {
			throw new ReferenceError("Attempted to update a tab that does not exist.");
		}
		var index = -1;
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				index = i;
			}
		}
		for (var key in data) {
			if (data[key] == undefined) {
				throw new ReferenceError("Key " + key + " is undefined.");
			}
			tabs._state.tabs[index][key] = data[key];
		}
	},
	destroy: function (id) {
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				tabs._state.tabs.remove(i);
				return i;
			}
		}
		return false;
	},
	get: function (id) {
		if (!id) { //no id provided, return an array of all tabs
			return tabs._state.tabs;
		}
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				return tabs._state.tabs[i]
			}
		}
		return undefined;
	},
	getIndex: function (id) {
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				return i;
			}
		}
		return -1;
	},
	getSelected: function () {
		return tabs._state.selected;
	},
	getAtIndex: function (index) {
		return tabs._state.tabs[index] || undefined;
	},
	setSelected: function (id) {
		if (!tabs.get(id)) {
			throw new ReferenceError("Attempted to select a tab that does not exist.");
		}
		tabs._state.selected = id;
	},
	count: function () {
		return tabs._state.tabs.length;
	},

}
;/* fades out tabs that are inactive */

var tabActivity = {
	minFadeAge: 450000,
	refresh: function () {
		var tabSet = tabs.get(),
			selected = tabs.getSelected(),
			time = new Date().getTime();


		tabSet.forEach(function (tab) {
			if (selected == tab.id) { //never fade the current tab
				getTabElement(tab.id).removeClass("fade");
				return;
			}
			if (time - tab.lastActivity > tabActivity.minFadeAge) { //the tab has been inactive for greater than minActivity, and it is not currently selected
				getTabElement(tab.id).addClass("fade");
			} else {
				getTabElement(tab.id).removeClass("fade");
			}
		})
	},
	init: function () {
		setInterval(tabActivity.refresh, 7500);
	}
}
tabActivity.init();
;/* draws tabs and manages tab events */

var tabGroup = $(".tab-group #tabs");

function getTabElement(id) { //gets the DOM element for a tab
	return $(".tab-item[data-tab={id}]".replace("{id}", id))
}

//gets the input for a tab element

$.fn.getInput = function () {
	return this.find(".tab-input");
}

function setActiveTabElement(tabId) {
	$(".tab-item").removeClass("active");

	var el = getTabElement(tabId);
	el.addClass("active");

	if (tabs.count() > 1) { //if there is only one tab, we don't need to indicate which one is selected
		el.addClass("has-highlight");
	} else {
		el.removeClass("has-highlight");
	}

	el[0].scrollIntoView({
		behavior: "smooth"
	});

}

function leaveTabEditMode(options) {
	$(".tab-item").removeClass("selected");
	options && options.blur && $(".tab-item .tab-input").blur();
	tabGroup.removeClass("has-selected-tab");
	hideAwesomebar();
}

function enterEditMode(tabId) {
	var tabEl = getTabElement(tabId);
	var webview = getWebview(tabId)[0];

	//when editing a tab, show the current page url. Sometimes, if the webview was just created, getting the URL can throw an error. If this happens, we fallback to whatever was there already.
	try {
		var currentURL = webview.getURL();
	} catch (e) {
		console.warn("failed to get webview URL");
		var currentURL = null;
	}

	var input = tabEl.getInput();

	tabEl.addClass("selected");
	input.focus().val(currentURL).select();
	showAwesomebar(input);
	tabGroup.addClass("has-selected-tab");

	//show keyword suggestions in the awesomebar

	try { //before first webview navigation, this will be undefined
		getWebview(tabs.getSelected())[0].send("getKeywordsData");
	} catch (e) {

	}
}

function rerenderTabElement(tabId) {
	var tabEl = getTabElement(tabId);

	var tabData = tabs.get(tabId);

	var tabTitle = tabData.title || "New Tab";
	tabEl.find(".tab-view-contents .title").text(tabTitle).attr("title", tabTitle);
	tabEl.find(".tab-view-contents .icon-tab-is-secure, .icon-tab-is-private").remove(); //remove previous secure and private icons. Reader view icon is updated seperately, so it is not removed.

	if (tabData.secure) {
		tabEl.find(".tab-view-contents").prepend("<i class='fa fa-lock icon-tab-is-secure'></i>");
	}

	if (tabData.private) {
		tabEl.find(".tab-view-contents").prepend("<i class='fa fa-ban icon-tab-is-private'></i>").attr("title", "Private tab");
	}

	//update the star to reflect whether the page is bookmarked or not
	bookmarks.renderStar(tabId, tabEl.find(".bookmarks-button"));
}

function createTabElement(tabId) {
	var data = tabs.get(tabId),
		title = "Search or enter address",
		url = urlParser.parse(data.url);

	var tab = $("<div class='tab-item'>");
	tab.attr("data-tab", tabId);

	if (data.private) {
		tab.addClass("private-tab");
	}

	//swipe to delete tab

	tab.on("mousewheel", function (e) {
		if (e.originalEvent.deltaY > 35 && e.originalEvent.deltaX < 10) {
			var tab = $(this).attr("data-tab");

			//TODO this should be a css animation
			getTabElement(tab).animate({
				"margin-top": "-40px",
			}, 150, function () {
				destroyTab(tab);

				if (tabs.count() == 0) {
					addTab();
				}
			});
		}
	});

	var input = $("<input class='tab-input theme-text-color mousetrap'>");
	input.attr("placeholder", title);
	input.attr("value", url);

	var ec = $("<div class='tab-edit-contents'>");

	input.appendTo(ec);

	bookmarks.getStar(tabId).appendTo(ec);

	ec.appendTo(tab);

	var vc = $("<div class='tab-view-contents theme-text-color'>")
	readerView.getButton(tabId).appendTo(vc);

	vc.append($("<span class='title'>").text(data.title || "New Tab"));
	vc.appendTo(tab);


	//events
	tab.on("click", function (e) {
		var tabId = $(this).attr("data-tab");

		//if the tab isn't focused
		if (tabs.getSelected() != tabId) {
			$(".tab-input").blur();
			switchToTab(tabId);
		} else { //the tab is focused, edit tab instead
			enterEditMode(tabId);
		}

	});

	/* events */

	input.on("keydown", function (e) {
		if (e.keyCode == 9 || e.keyCode == 40) { //if the tab or arrow down key was pressed
			focusAwesomebarItem();
			e.preventDefault();
		}
	});

	//keypress doesn't fire on delete key - use keyup instead
	input.on("keyup", function (e) {
		if (e.keyCode == 8) {
			showAwesomebarResults($(this).val(), $(this), e);
		}
	});

	input.on("keypress", function (e) {

		if (e.keyCode == 13) { //return key pressed; update the url
			var tabId = $(this).parents(".tab-item").attr("data-tab");
			var newURL = parseAwesomebarURL($(this).val());

			navigate(tabId, newURL);
			leaveTabEditMode(tabId);

		} else if (e.keyCode == 9) {
			//tab key, do nothing - in keydown listener
		} else if (e.keyCode == 16) {
			//shift key, do nothing
		} else if (e.keyCode == 8) {
			//delete key is handled in keyUp
		} else { //show the awesomebar
			showAwesomebarResults($(this).val(), $(this), e);
		}
	});

	//on keydown, if the autocomplete result doesn't change, we move the selection instead of regenerating it to avoid race conditions with typing. Adapted from https://github.com/patrickburke/jquery.inlineComplete
	input.on("keypress", function (e) {
		var v = String.fromCharCode(e.keyCode).toLowerCase();
		var sel = this.value.substring(this.selectionStart, this.selectionEnd).indexOf(v);

		if (v && sel == 0) {
			this.selectionStart += 1;
			didFireKeydownSelChange = true;
			return false;
		} else {
			didFireKeydownSelChange = false;
		}
	});

	//prevent clicking in the input from re-entering edit-tab mode

	input.on("click", function (e) {
		e.stopPropagation();
	});

	return tab;
}

function addTab(tabId, options) {
	/* options 
	
		options.focus - whether to enter editing mode when the tab is created. Defaults to true.
		options.openInBackground - whether to open the tab without switching to it. Defaults to false.
		options.leaveEditMode - whether to hide the awesomebar when creating the tab
	
		*/

	options = options || {}

	if (options.leaveEditMode != false) {
		leaveTabEditMode(); //if a tab is in edit-mode, we want to exit it
	}

	tabId = tabId || tabs.add({
		backgroundColor: "rgb(255, 255, 255)",
		foregroundColor: "black"
	});


	tabGroup.append(createTabElement(tabId));
	addWebview(tabId, {
		openInBackground: options.openInBackground, //if the tab is being opened in the background, the webview should be as well
	});

	//use the default colors while creating a tab


	//open in background - we don't want to enter edit mode or switch to tab

	if (options.openInBackground) {
		return;
	}

	switchToTab(tabId);
	if (options.focus != false) {
		enterEditMode(tabId)
	}
}

//startup state is created in sessionRestore.js

//when we click outside the navbar, we leave editing mode

$(document.body).on("focus", "webview", function () {
	leaveTabEditMode();
});
;/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on("zoomIn", function () {
	getWebview(tabs.getSelected())[0].send("zoomIn");
});

ipc.on("zoomOut", function () {
	getWebview(tabs.getSelected())[0].send("zoomOut");
});

ipc.on("zoomReset", function () {
	getWebview(tabs.getSelected())[0].send("zoomReset");
});

ipc.on("print", function () {
	getWebview(tabs.getSelected())[0].print();
})

ipc.on("inspectPage", function () {
	getWebview(tabs.getSelected())[0].openDevTools();
});

ipc.on("addTab", function (e) {
	addTab();
});

ipc.on("addPrivateTab", function (e) {
	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	})
	addTab(privateTab);
});

var Mousetrap = require("mousetrap");

Mousetrap.bind("shift+command+p", function (e) {
	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	})
	addTab(privateTab);
});

Mousetrap.bind(["command+l", "command+k"], function (e) {
	enterEditMode(tabs.getSelected());
	return false;
})

Mousetrap.bind("command+w", function (e) {
	e.preventDefault();
	e.stopImmediatePropagation();
	e.stopPropagation();
	destroyTab(tabs.getSelected(), {
		switchToTab: true
	});
	return false;
});

Mousetrap.bind("command+d", function (e) {
	//TODO need an actual api for this that updates the star and bookmarks

	getTabElement(tabs.getSelected()).find(".bookmarks-button").click();
})

Mousetrap.bind("command+f", function (e) {
	findinpage.toggle();
});

// cmd+x should switch to tab x. Cmd+9 should switch to the last tab

for (var i = 0; i < 9; i++) {
	(function (i) {
		Mousetrap.bind("command+" + i, function (e) {
			var newTab = tabs.getAtIndex(i - 1);
			if (!newTab) { //we're trying to switch to a tab that doesn't exist
				return;
			}
			switchToTab(newTab.id);
		})
	})(i);
}

Mousetrap.bind("command+9", function (e) {
	switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
})

Mousetrap.bind("esc", function (e) {
	leaveTabEditMode();
	getWebview(tabs.getSelected()).focus();
});

Mousetrap.bind("shift+command+r", function () {
	getTabElement(tabs.getSelected()).find(".reader-button").trigger("click");
});

//TODO add help docs for this

Mousetrap.bind("command+left", function (d) {
	getWebview(tabs.getSelected())[0].goBack();
});

Mousetrap.bind("command+right", function (d) {
	getWebview(tabs.getSelected())[0].goForward();
});

Mousetrap.bind(["option+command+left", "shift+ctrl+tab"], function (d) {
	var currentIndex = tabs.getIndex(tabs.getSelected());
	var previousTab = tabs.getAtIndex(currentIndex - 1);

	if (previousTab) {
		switchToTab(previousTab.id);
	} else {
		switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
	}
});

Mousetrap.bind(["option+command+right", "ctrl+tab"], function (d) {
	var currentIndex = tabs.getIndex(tabs.getSelected());
	var nextTab = tabs.getAtIndex(currentIndex + 1);

	if (nextTab) {
		switchToTab(nextTab.id);
	} else {
		switchToTab(tabs.getAtIndex(0).id);
	}
});
;/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerURL = "file://" + __dirname + "/pdfjs/web/viewer.html?url=";

ipc.on("openPDF", function (event, filedata) {
	console.log(filedata);
	var cTab = tabs.get(tabs.getSelected());

	var webview = getWebview(cTab.id);

	//If the current tab is blank or has the url of the pdf we are opening, we open the pdf in the current tab. Otherwise, to avoid losing pages, we open a new tab with the pdf.

	var PDFurl = PDFViewerURL + filedata.url;

	if (cTab.url == PDFurl) { //if we are already on the pdf we are navigating to, ignore it
		return;
	}


	if (cTab.url == "about:blank" || cTab.url == filedata.item.url) {
		navigate(tabs.getSelected(), PDFurl)
	} else {

		var newTab = tabs.add({
			url: PDFurl
		})

		addTab(newTab, {
			focus: false
		});

	}
});
;var findinpage = {
	container: $("#findinpage-bar"),
	input: $("#findinpage-bar .findinpage-input"),
	isEnabled: false,
	start: function (options) {
		findinpage.container.prop("hidden", false);
		findinpage.isEnabled = true;
		findinpage.input.focus().select();
	},
	end: function (options) {
		findinpage.container.prop("hidden", true);
		if (options && options.blurInput != false) {
			findinpage.input.blur();
		}
		findinpage.isEnabled = false;

		//focus the webview

		getWebview(tabs.getSelected()).focus();
	},
	toggle: function () {
		if (findinpage.isEnabled) {
			findinpage.end();
		} else {
			findinpage.start();
		}
	},
	escape: function (text) { //removes apostrophes from text so we can safely embed it in a string
		return text.replace(/'/g, "\\'");
	}
}

findinpage.input.on("keyup", function (e) {
	//escape key should exit find mode, not continue searching
	if (e.keyCode == 27) {
		findinpage.end();
		return;
	}
	var text = findinpage.escape($(this).val());
	var webview = getWebview(tabs.getSelected())[0];

	//this stays on the current text if it still matches, preventing flickering. However, if the return key was pressed, we should move on to the next match instead, so this shouldn't run.
	if (e.keyCode != 13) {
		webview.executeJavaScript("window.getSelection().empty()");
	}

	webview.executeJavaScript("find('{t}', false, false, true, false, false, false)".replace("{t}", text)); //see https://developer.mozilla.org/en-US/docs/Web/API/Window/find for a description of the parameters
});

findinpage.input.on("blur", function (e) {
	findinpage.end({
			blurInput: false
		}) //if end tries to blur it again, we'll get stuck in an infinite loop with the event handler
});
;var sessionRestore = {
	save: function () {
		var data = {
			version: 1,
			tabs: tabs._state.tabs,
			selected: tabs._state.selected,
		}
		localStorage.setItem("sessionrestoredata", JSON.stringify(data));
	},
	restore: function () {
		try {
			//get the data
			var data = JSON.parse(localStorage.getItem("sessionrestoredata") || "{}");

			localStorage.setItem("sessionrestoredata", "{}");

			if (data.version && data.version != 1) {
				addTab();
				return;
			}

			console.info("restoring tabs", tabs.get());

			if (!data || !data.tabs || !data.tabs.length || (data.tabs.length == 1 && data.tabs[0].url == "about:blank")) { //If there are no tabs, or bif we only have one tab, and its about:blank, don't restore
				addTab();
				return;
			}

			data.tabs.forEach(function (tab, index) {
				if (!tab.private) { //don't restore private tabs
					var newTab = tabs.add(tab);
					addTab(newTab);
				}

			});

			//set the selected tab

			switchToTab(data.selected);

			//we delete the data, restore the session, and then re-save it. This means that if for whatever reason the session data is making the browser hang, you can restart it and get a new session.

			sessionRestore.save();

		} catch (e) {
			console.warn("failed to restore session, rolling back");

			tabs._state.tabs = [];

			$("webview, .tab-item").remove();

			addTab();
			localStorage.setItem("sessionrestoredata", "{}");

		}
	}
}

//TODO make this a preference

sessionRestore.restore();

setInterval(sessionRestore.save, 15000);
