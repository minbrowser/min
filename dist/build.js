/*!
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
	isUrl: function (url) {
		return url.indexOf("http://") == 0 || url.indexOf("https://") == 0 || url.indexOf("file://") == 0 || url.indexOf("about:") == 0 || url.indexOf("chrome:") == 0 || url.indexOf("data:") == 0;
	},
	removeProtocol: function (url) {
		if (!urlParser.isUrl(url)) {
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
	isUrlMissingProtocol: function (url) {
		return url.indexOf(" ") == -1 && url.indexOf(".") > 0;
	},
	parse: function (url) {
		if (!url) {
			return "";
		}
		//if the url starts with a (supported) protocol, do nothing
		if (urlParser.isUrl(url)) {
			return url;
		}
		//if the url doesn't have a space and has a ., assume it is a url without a protocol
		if (urlParser.isUrlMissingProtocol(url)) {
			return "http://" + url;
		}
		//else, do a search
		return urlParser.searchBaseURL.replace("%s", url);
	}
}
;var cf = new ColorThief();

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
;var remote = require('remote');
var Menu = remote.require('menu');
var MenuItem = remote.require('menu-item');
var clipboard = require("clipboard")

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
		var event = cxevent.originalEvent || cxevent;
		webviewMenu.cache.event = event;

		console.log(event);

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
;/* common to webview, tabrenderer, etc */

function navigate(tabId, newURL) {
	console.trace();
	console.log("navigated");
	tabs.update(tabId, {
		url: newURL
	});

	updateWebview(tabId, newURL);

	leaveTabEditMode({
		blur: true
	});
}


function destroyTab(id) {
	//focus the next tab, or the previous tab if this was the last tab
	var t = tabs.getIndex(id);
	var nextTab = tabs.getAtIndex(t + 1) || tabs.getAtIndex(t - 1);

	$(".tab-item[data-tab={id}]".replace("{id}", id)).remove(); //remove the actual tab element
	var t = tabs.destroy(id); //remove from state - returns the index of the destroyed tab
	destroyWebview(id); //remove the webview

	console.log(t);
	console.log(nextTab);

	//if there are no other tabs, create a new one
	if (!nextTab) {
		return addTab();
	}
	switchToTab(nextTab.id);

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
;var awesomebarShown = false;
var awesomebarCachedText = "";
var cachedACItem = "";
var autocompleteEnabled = true;

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


var awesomebar = $("#awesomebar");
var historyarea = $(".history-results");
var bookmarkarea = $(".bookmark-results");
var serarea = $(".search-engine-results");
var iaarea = $(".instant-answer-results");

function showAwesomebar(triggerInput) {
	awesomebarCachedText = triggerInput.val();
	awesomebarShown = true;
	$(document.body).addClass("awesomebar-shown");
	//clear any previous results
	historyarea.html("");
	bookmarkarea.html("");
	serarea.html("");
	iaarea.html("");


	awesomebar.show();

	var currentTab = tabs.get(tabs.getSelected());

}

function hideAwesomebar() {
	awesomebarShown = false;
	$(document.body).removeClass("awesomebar-shown");
	awesomebar.hide();
	cachedBangSnippets = {};
}

var BANG_REGEX = /!\w+/g;

window.showDuckduckgoABData = throttle(function (text, input) {

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
				results = results.splice(0, 5);

				results.forEach(function (result) {
					var title = result.phrase;
					if (BANG_REGEX.test(result.phrase) && bangACSnippet) {
						title = result.phrase.replace(BANG_REGEX, "");
						var secondaryText = "Search on " + bangACSnippet;
					}
					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(title)).on("click", function () {
						navigate(tabs.getSelected(), result.phrase);
					});

					item.appendTo(serarea);

					if (urlParser.isUrl(result.phrase) || urlParser.isUrlMissingProtocol(result.phrase)) { //website suggestions
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

	//instant answers

	if (text.length > 3) {

		$.getJSON("https://api.duckduckgo.com/?skip_disambig=1&format=json&pretty=1&q=" + encodeURIComponent(text), function (res) {

			iaarea.find(".result-item").addClass("old");

			if (res.Abstract || res.Answer) {
				var item = $("<div class='result-item' tabindex='-1'>");
				item.text(res.Heading || unsafeUnwrapTags(res.Answer));

				if (res.Image) {
					$("<img class='result-icon image'>").attr("src", res.Image).prependTo(item);
				}

				$("<span class='description-block'>").text(removeTags(res.Abstract) || "Answer").appendTo(item);

				item.on("click", function () {
					navigate(tabs.getSelected(), res.AbstractURL || text)
				});
				item.appendTo(iaarea);
			}

			iaarea.find(".old").remove();
		});
	}
}, 800);

var METADATA_SEPARATOR = "·";

var showBookmarkResults = throttle(function (text) {
	bookmarks.search(text, function (results) {
		bookmarkarea.html("");
		results.splice(0, 2).forEach(function (result) {
			if (result.score > 0.001) {

				//create the basic item
				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.title)).on("click", function () {
					navigate(tabs.getSelected(), result.url);
				});

				$("<i class='fa fa-star'>").prependTo(item);

				var span = $("<span class='secondary-text'>").text(urlParser.removeProtocol(result.url));


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
			}

		});
	});
}, 400);

var showAwesomebarResults = throttle(function (text, input, keyCode) {

	var shouldContinueAC = !(keyCode == 8); //this needs to be outside searchHistory so that it doesn't get reset if the history callback is run multiple times (such as when multiple messages get sent before the worker has finished startup).

	console.log("awesomebar: ", text);

	if (text == awesomebarCachedText) { //if nothing has actually changed, don't re-render
		return;
	}


	//there is no text, show a blank awesomebar
	if (text.length < 1) {
		serarea.html("");
		iaarea.html("");
		return;
	}

	if (text.length > 3) {
		showBookmarkResults(text);
	}

	var input0 = input[0];

	bookmarks.searchHistory(text, function (results) {
		console.log("recieved history data: ", text, results);
		historyarea.html("");

		results.forEach(function (result, index) {

			//if we've started typing the result and didn't press the delete key (which should make the highlight go away), autocomplete in the input

			var text = input.val(); //make sure the input hasn't changed between start and end of query

			var textWithoutProtocol = urlParser.removeProtocol(text),
				UrlWithoutProtocol = urlParser.removeProtocol(result.url);

			if (textWithoutProtocol != text) {
				var hasProtocol = true;
			}
			var hasWWW = text.indexOf("www.") != -1

			if (textWithoutProtocol.indexOf("/") == -1) {
				var hasPath = false;
			} else {
				var hasPath = true;
			}
			if (shouldContinueAC && cachedACItem.indexOf(text) == 0) {
				input.blur();
				input0.value = cachedACItem;
				input0.setSelectionRange(text.length, cachedACItem.length);
				input.focus();
				awesomebarCachedText = input.val();
				shouldContinueAC = false;
			}
			if (autocompleteEnabled && shouldContinueAC && textWithoutProtocol && UrlWithoutProtocol.indexOf(textWithoutProtocol) == 0) { //the user has started to type the url
				console.log("autocompleting");
				var withWWWset = ((hasWWW) ? result.url : result.url.replace("www.", ""))
				var ac = ((hasProtocol) ? withWWWset : UrlWithoutProtocol);
				if (!hasPath) {
					//if there isn't a / character typed yet, we only want to autocomplete to the domain
					var a = document.createElement("a");
					a.href = withWWWset;
					ac = ((hasProtocol) ? a.protocol + "//" : "") + a.hostname;
				}
				if (!ac) { //make sure we have something to autocomplete - this could not exist if we are using domain autocomplete and the ac string didn't have a hostname when processed
					return;
				}
				input.blur();
				input0.value = ac;
				input0.setSelectionRange(text.length, ac.length);
				input.focus();
				//update cache
				awesomebarCachedText = input0.value,
					shouldContinueAC = false,
					cachedACItem = ac;
			}

			if (index < 3) { //only show up to three history items

				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.title)).on("click", function () {
					navigate(tabs.getSelected(), result.url);
				});

				$("<i class='fa fa-globe'>").prependTo(item);

				$("<span class='secondary-text'>").text(urlParser.removeProtocol(result.url)).appendTo(item);

				item.appendTo(historyarea);
			}

		});
	});


	showDuckduckgoABData(text, input);

	//update cache
	awesomebarCachedText = text;
}, 25);

function focusAwesomebarItem(options) {
	options = options || {}; //fallback if options is null
	var previous = options.focusPrevious;
	var allItems = $("#awesomebar .result-item");
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
;/* implements selecting webviews, switching between them, and creating new ones. */

var webviewBase = $("#webviews");

function updateURLInternal(webview, url) {
	console.log("setting url to " + url)
	webview.attr("src", url);
}

function getWebviewDom(options) {
	var url = (options || {}).url || "about:blank";

	var w = $("<webview>");
	w.attr("preload", "js/view_unsafe/webview_preload.js")
	w.attr("src", urlParser.parse(url));
	w.attr("data-tab", options.tabId);

	//if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
	//since tab IDs are unique, we can use them as partition names
	if (tabs.get(options.tabId).private == true) {
		w.attr("partition", options.tabId);
	}

	//webview events

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
		var url = e.target.getUrl();

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
		if (url.indexOf(__dirname + "/reader/index.html") == 7) { //"file://" is 7 characters
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

		if (tabs.get(tab).private == false) { //don't save to history if in private mode
			bookmarks.updateHistory(tab);
		}

		rerenderTabElement(tab);

	});

	w.on("did-get-redirect-request", function (e) {
		//console.log(e.originalEvent);
	});


	/* too buggy, disabled for now

	w.on("did-fail-load", function (e) {
		if (e.originalEvent.validatedUrl == this.getUrl()) {
			updateURLInternal($(this), "file:///" + __dirname + "/pages/error/index.html?e=" + JSON.stringify(e.originalEvent) + "&url=" + $(this)[0].getUrl());
		}
	});
		
	*/

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

		if (e.originalEvent.channel == "bookmarksData") {
			bookmarks.onDataRecieved(e.originalEvent.args[0]);
		} else if (e.originalEvent.channel == "canReader") {
			tabs.update(tab, {
				readerable: true
			});
			readerView.updateButton(tab);
		} else if (e.originalEvent.channel == "contextData") {
			webviewMenu.loadFromContextData(e.originalEvent.args[0]);
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
	$("webview[data-tab={id}]".replace("{id}", id)).removeClass("hidden").show(); //in some cases, webviews had the hidden class instead of display:none to make them load in the background. We need to make sure to remove that.
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

		var tabId = Math.round(Math.random() * 100000000000000000);


		tabs._state.tabs.push({
			url: tab.url,
			title: tab.title,
			id: tabId,
			lastActivity: new Date().getTime(),
			secure: false,
			private: tab.private || false,
			readerable: false,
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
			url: w.getUrl(),
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
		if (!bookmarks.authBookmarkTab || getWebview(bookmarks.authBookmarkTab)[0].getUrl() != data.url) {
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
	onMessage: function (e) { //assumes this is from a search operation
		if (e.data.scope == "bookmarks") {
			//TODO this (and the rest) should use unique callback id's
			bookmarks.currentCallback(e.data.result);
		} else { //history search
			bookmarks.currentHistoryCallback(e.data.result);
		}
	},
	bookmark: function (tabId) {

		bookmarks.authBookmarkTab = tabId;
		getWebview(tabId)[0].executeJavaScript("window._browser_sendData()");
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
			var currentUrl = getWebview(tabId)[0].getUrl();
		} catch (e) {
			var currentUrl = tabs.get(tabId).url;
		}

		if (!currentUrl || currentUrl == "about:blank") { //no url, can't be bookmarked
			star.prop("hidden", true);
		} else {
			star.prop("hidden", false);
		}

		//check if the page is bookmarked or not, and update the star to match

		bookmarks.search(currentUrl, function (results) {
			if (results && results[0] && results[0].url == currentUrl) {
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
;/* fades out tabs that are inactive */

var tabActivity = {
	minAge: 500000,
	refresh: function () {
		var tabSet = tabs.get(),
			selected = tabs.getSelected(),
			time = new Date().getTime();


		tabSet.forEach(function (tab) {
			if (time - tab.lastActivity > tabActivity.minAge && selected != tab.id) { //the tab has been inactive for greater than minActivity, and it is not currently selected
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
	getTabElement(tabId).addClass("active");
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
		var currentUrl = webview.getUrl();
	} catch (e) {
		console.warn("failed to get webview URL");
		var currentUrl = null;
	}

	var input = tabEl.getInput();

	tabEl.addClass("selected");
	input.focus().val(currentUrl).select();
	showAwesomebar(input);
	tabGroup.addClass("has-selected-tab");
}

function rerenderTabElement(tabId) {
	console.log(tabId);
	var tabEl = getTabElement(tabId);

	var tabData = tabs.get(tabId);


	tabEl.find(".tab-view-contents .title").text(tabData.title || "New Tab");
	tabEl.find(".tab-view-contents i").remove(); //remove previous icons

	if (tabData.secure) {
		tabEl.find(".tab-view-contents").prepend("<i class='fa fa-lock'></i>");
	}

	if (tabData.private) {
		tabEl.find(".tab-view-contents").prepend("<i class='fa fa-ban'></i>").attr("title", "Private tab");
	}

	//update the star to reflect whether the page is bookmarked or not
	bookmarks.renderStar(tabId, tabEl.find(".bookmarks-button"));
}

function createTabElement(tabId) {
	console.log(tabId);
	var data = tabs.get(tabId),
		title = data.title || "Search or enter address",
		url = urlParser.parse(data.url);

	var tab = $("<div class='tab-item'>");
	tab.attr("data-tab", tabId);

	if (data.private) {
		tab.addClass("private-tab");
	}

	var input = $("<input class='tab-input theme-text-color mousetrap'>");
	input.attr("placeholder", title);
	input.attr("value", url);

	var ec = $("<div class='tab-edit-contents'>");

	input.appendTo(ec);

	bookmarks.getStar(tabId).appendTo(ec);

	ec.appendTo(tab);

	var vc = $("<div class='tab-view-contents theme-text-color'>")
	readerView.getButton(tabId).appendTo(vc);

	vc.append("<span class='title'>");
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
	})

	input.on("keyup", function (e) {
		if (e.keyCode == 13) { //return key pressed; update the url
			var tabId = $(this).parents(".tab-item").attr("data-tab");
			var newURL = $(this).val();

			navigate(tabId, newURL);

			switchToTab(tabId);


		} else if (e.keyCode == 9) {
			//tab key, do nothing - in keydown listener

		} else { //show the awesomebar
			showAwesomebarResults(input.val(), input, e.keyCode);
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
	
	*/

	options = options || {}
	leaveTabEditMode(); //if a tab is in edit-mode, we want to exit it

	tabId = tabId || tabs.add({
		backgroundColor: "",
		foregroundColor: ""
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

	setColor("", "");

	switchToTab(tabId);
	if (options.focus != false) {
		enterEditMode(tabId)
	}
}

//startup - add a tab. remove when session restore is complete

addTab();

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

Mousetrap.bind("command+l", function (e) {
	enterEditMode(tabs.getSelected());
	return false;
})

Mousetrap.bind("command+w", function (e) {
	e.preventDefault();
	e.stopImmediatePropagation();
	e.stopPropagation();
	destroyTab(tabs.getSelected());
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
;/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerUrl = "file://" + __dirname + "/pdfjs/web/viewer.html?url=";

ipc.on("openPDF", function (data) {
	var webview = getWebview(tabs.getSelected());

	//If the current tab is blank or has the url of the pdf we are opening, we open the pdf in the current tab. Otherwise, to avoid losing pages, we open a new tab with the pdf.

	var PDFurl = PDFViewerUrl + data.item.url;


	if (tabs.get(tabs.getSelected()).url == "about:blank" || tabs.get(tabs.getSelected()).url == data.item.url) {
		navigate(tabs.getSelected(), PDFurl)
	} else {

		var newTab = tabs.add({
			url: PDFViewerUrl + data.item.url
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
	console.log(text);
	getWebview(tabs.getSelected())[0].executeJavaScript("find('{t}', false, false, true, false, false, false)".replace("{t}", text)); //see https://developer.mozilla.org/en-US/docs/Web/API/Window/find for a description of the parameters
});

findinpage.input.on("blur", function (e) {
	findinpage.end({
			blurInput: false
		}) //if end tries to blur it again, we'll get stuck in an infinite loop with the event handler
});
