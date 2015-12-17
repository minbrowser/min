function debug_phishing(msg) {
	//uncomment for debug mode
	console.log(msg);
}


/* phishing detector. Implements methods from http://www.ml.cmu.edu/research/dap-papers/dap-guang-xiang.pdf and others, as well as some custom methods */

var tldRegex = /\.(com|net|org|edu|gov|mil)$/g;

var doubleDomainRegex = /\.(com|net|org|edu|gov|mil|uk|ca|jp|fr|au|us|ru|ch|it|nl|de|es)(\.|-).*(com|net|org|edu|gov|mil|uk|ca|jp|fr|au|us|ru|ch|it|nl|de|es)/g;

function checkPhishingStatus() {

	//if there isn't a password input or form, skip the phishing analysis, since this probably isn't a phish
	if (!document.querySelector("input[type=password], form")) {
		return false;
	}


	var scanStart = performance.now();

	function isSensitive(form) { //checks if a form is asking for sensitive information

		if (form.querySelector("input[type=password]")) {

			debug_phishing("form with password input found, decreasing threshold");
			minPhishingScore *= 0.7;

			return true;
		}

		if (form.querySelectorAll("input[type=text], input[type=password]").length == 2) {
			debug_phishing("possibly sensitive form, checking but increasing minScore");

			minPhishingScore *= 1.25;
			return true;
		}

		//empty forms can be misleading

		if (!form.querySelector("input")) {
			debug_phishing("empty form found, checking but increasing minScore");
			minPhishingScore += 0.35;
			return true;
		}

		//if the form contains a sensitive word
		var tx = form.textContent.toLowerCase();

		for (var i = 0; i < sensitiveFormWords.length; i++) {
			if (tx.indexOf(sensitiveFormWords[i]) != -1) {
				debug_phishing("sensitive word found in form, checking");
				minPhishingScore += 0.15;
				return true;
			}
		}

		return false;
	}

	function getRootDomain(hostname) {
		var newData = hostname;
		tldRegex.lastIndex = 0;
		var chunks = hostname.split(".");

		if (tldRegex.test(hostname)) {
			newData = chunks[chunks.length - 2] + "." + chunks[chunks.length - 1]
		}

		if (newData.indexOf("www.") == 0) {
			newData = newData.replace("www.", "");
		}
		return newData;
	}


	//if we have a password input, set a lower threshold

	if (document.querySelector("input[type=password]")) {
		minPhishingScore = 0.9;
	}

	var sensitiveWords = ["secure", "account", "webscr", "login", "ebayisapi", "signing", "banking", "confirm"];
	var sensitiveFormWords = ["password", "creditcard", "credit card", "security code", "expiration date", "card type"]; //word commonly found in forms that ask for personal information
	var whitelistedDomains = ["adobeid-na1.services.adobe.com", "login.live.com", "www.phishtank.com", "www.wellsfargo.com", "online.citi.com", , "www.bankofamerica.com", "my.hrw.com", "www.fastcompany.com"]; //a whitelist of things we mistakenly think are bad. These should be fixed eventually, but for now a whitelist will work.

	//on the whitelist

	for (var i = 0; i < whitelistedDomains.length; i++) {
		if (whitelistedDomains[i] === window.location.hostname) {
			return;
		}
	}

	var loc = window.location.toString();
	var bodyText = document.body.textContent;
	var bodyHtml = document.body.innerHTML;

	var minPhishingScore = 1.25;
	var phishingScore = 0;

	//used for url parsing

	var aTest = document.createElement("a");

	//checks if the url has multiple domain endings in it. Catches things like "example.com.com", "example.com/example2.com", "secure.example.com.phishingsite.com", etc.

	if (doubleDomainRegex.test(loc)) {
		debug_phishing("found misleading domain");
		phishingScore += 0.0075 * window.location.toString().length;
	}

	//no https - either insecure, phishing, or both

	if (window.location.protocol != "https:") {
		debug_phishing("no https");
		phishingScore += 0.15;
	}

	//penalize long hostnames, since these are often used for phishing

	if (window.location.host.length > 25) {
		debug_phishing("long hostname detected");
		phishingScore += window.location.host.length * 0.0075;
	}

	//penalize extremely long locations, since these could also be used for phishing

	if (loc.split("?")[0].length > 100) {
		debug_phishing("long window location detected");
		phishingScore += Math.min(window.location.toString().length * 0.0005, 0.2);
	}

	//CANTINA - penalize locations with lots of dots

	if (window.location.hostname.split(".").length > 3) {
		debug_phishing("high number of . characters detected");
		phishingScore += Math.min(loc.split("?")[0].split(".").length * 0.03, 0.2);
	}

	//compromised websites used for phishing tend to host phishing pages within a directory to avoid detection. Real websites tend to have a url like example.com/login, though.

	if (window.location.pathname.length > 25) {
		debug_phishing("paths detected");
		phishingScore += Math.min(0.05 + (0.002 * window.location.pathname.length), 0.3);
	}

	if (window.location.pathname == "/" && window.location.hostname.replace("www.", "").length < 18) {
		debug_phishing("short root domain found, increasing minScore");
		minPhishingScore += 0.3 + 0.05 * (18 - window.location.hostname.length);
	}

	sensitiveWords.forEach(function (word) {
		if (loc.toLowerCase().indexOf(word) != -1) {
			debug_phishing("detected sensitive word found in location");
			phishingScore += 0.025;
		}
	});

	//implements feature 8 from http://www.ml.cmu.edu/research/dap-papers/dap-guang-xiang.pdf

	var forms = document.querySelectorAll("form");
	var totalFormLength = 0;
	var formWithoutActionFound = false;
	var formWithSimplePathFound = false;
	var sensitiveFormFound = false;

	//loop through each form
	if (forms) {
		for (var i = 0; i < forms.length; i++) {
			var form = forms[i];
			var formText = form.textContent;

			//if the form isn't sensitive, don't scan it

			if (!isSensitive(form)) {
				continue;
			}

			sensitiveFormFound = true;

			var fa = form.getAttribute("action");

			//if no action, form might be fake

			if (!fa || loc.split("?")[0].indexOf(fa.split("?")[0]) != -1) { //we also check if the form just submits to the same page with a different query string
				debug_phishing("form without action detected");
				formWithoutActionFound = true;
				continue;
			}

			totalFormLength += form.innerHTML.length;

			if (form.getAttribute("onsubmit")) {
				debug_phishing("js html attribute onsubmit detected");
				phishingScore += 0.05;
			}

			//if the form action is in the same directory as the current page, it is likely to be phishing

			var slashCt = fa.replace(window.location.toString(), "").replace(window.location.pathname, "").split("/").length - 1;

			if (slashCt < 2) {
				debug_phishing("form with simple path for action detected");
				formWithSimplePathFound = true;
			} else if (slashCt < 3) {
				debug_phishing("non-absolute form path detected");
				phishingScore += 0.1;
			}

			//many toolkits seem to use php files, but most legitimate websites don't

			if (fa.indexOf(".php") != -1) {
				debug_phishing("php file action found");
				phishingScore += 0.075;
			}

			aTest.href = fa;

			// if the form is submitted to a different domain, it is suspicious

			if (getRootDomain(aTest.hostname) != getRootDomain(window.location.hostname)) {
				debug_phishing("submitting form to xdomain");
				phishingScore += 0.35;
			}


			if (aTest.protocol != "https:") {
				debug_phishing("submitting form without https");
				phishingScore += 0.15;
			}

			//if the form text contians a sensitive word in it, it is more likely to be phishing

			sensitiveWords.forEach(function (w) {
				if (formText.indexOf(w) != -1) {
					debug_phishing("sensitive word found in form");
					phishingScore += 0.02;
				}
			})

		}

		if (formWithoutActionFound == true) {
			phishingScore += 0.4;
			phishingScore += Math.min(0.2, totalFormLength * 0.0001)
		}

		if (formWithSimplePathFound == true) {
			phishingScore += 0.75;
		}
	}
	if (!sensitiveFormFound) {
		debug_phishing("no sensitive forms found, increasing minScore");

		minPhishingScore += 0.1;
	}

	var links = document.querySelectorAll("a, area[href]"); //area tag is for image maps

	var linkDomains = {};
	var linkSources = {};

	var emptyLinksFound = 0;
	var javascriptLinksFound = 0;

	for (var i = 0; i < links.length; i++) {

		var href = links[i].getAttribute("href");

		//if href is blank or meaningless, page is more likely to be phishing (http://www.ml.cmu.edu/research/dap-papers/dap-guang-xiang.pdf item 9)

		if (!href || href == "#" && !links[i].onclick) { //ignore links that have a javascript handler, since these are expected to have an empty href
			emptyLinksFound++;
			continue;
		}

		//phishing sites use javascript: url's more often than legitimate sites, check for that

		if (href.indexOf("javascript:") == 0) {
			javascriptLinksFound++;
		}

		aTest.href = links[i].href;

		linkDomains[aTest.host] = linkDomains[aTest.host] + 1 || 1;
		linkSources[href] = linkSources[href] + 1 || 1;
	}

	//if there are several external links that point to the same domain, increase likelyhood of phishing

	var sameDomainLinks = 0;
	var totalLinks = 0;

	var rd = getRootDomain(window.location.host);

	for (var key in linkDomains) {
		totalLinks += linkDomains[key];
		if (getRootDomain(key) == rd) {
			sameDomainLinks += linkDomains[key];
			continue;
		}
		if (linkDomains[key] > 4 && key) {
			debug_phishing("found " + linkDomains[key] + " links that point to domain " + key)
			phishingScore += Math.min(0.05 + (0.025 * linkDomains[key]), 0.25);
			break; //we don't want to increase the phishing score more than once
		}
	}

	//if all or most of the links on the page are to external domains, likely to be phishing

	if (totalLinks > 2 && sameDomainLinks == 0 || (totalLinks > 5 && sameDomainLinks / totalLinks < 0.15)) {
		debug_phishing("links go to external domain");
		phishingScore += Math.min((totalLinks - sameDomainLinks) * 0.075, 0.5);
	}

	//if there are a bunch of empty links, increase score
	if (emptyLinksFound > 5 || (totalLinks > 2 && emptyLinksFound / totalLinks > 0.5)) {
		debug_phishing("counted " + emptyLinksFound + " empty links");
		phishingScore += Math.min(emptyLinksFound * 0.02, 0.2);
	}

	//if there are a lot of js links
	if (javascriptLinksFound > 3) {
		debug_phishing("counted " + javascriptLinksFound + " javascript links");
		phishingScore += 0.1;
	}

	//if most of the page isn't forms, set a higher threshold

	var totalDocLength = bodyHtml.length;

	if (totalFormLength > 50 && totalFormLength < 1000 && totalFormLength / totalDocLength < 0.075) {
		debug_phishing("forms are very minor part of page, increasing minScore");
		minPhishingScore += Math.min(1.15 - totalFormLength / totalDocLength, 1.2);
	} else if (totalFormLength > 50 && totalFormLength < 3500 && totalFormLength / totalDocLength < 0.14) {
		debug_phishing("forms are minor part of page, increasing minScore (small)");
		debug_phishing(totalFormLength);
		debug_phishing(totalDocLength);
		minPhishingScore += 0.25;
	}

	//checks if most, but not all of the scripts on a page come from an external domain, possibly indicating an injected phishing script
	var scripts = document.querySelectorAll("script");

	var scriptSources = {};
	var totalScripts = 0;
	if (scripts) {
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].src) {
				aTest.href = scripts[i].src;
				var rd = aTest.hostname;
				scriptSources[rd] = scriptSources[rd] + 1 || 1;
				totalScripts++;
			}
		}
	}

	var previous = 0;

	for (var source in scriptSources) {
		if (scriptSources[source] > 2 && scriptSources[source] / totalScripts > 0.75 && scriptSources[source] < 0.95) {
			phishingScore += 0.1;
			debug_phishing("external scripts found, increasing score");
		}
		previous = scriptSources[source];
	}

	//if we have lots of forms, we need a higher threshold, since phishingScore tends to increase with more forms

	if (forms.length > 3) {
		minPhishingScore += Math.min(0.05 * forms.length, 0.2);
	}

	//tries to detect pages that use images to copy a ui

	if (bodyText.length < 500) {
		debug_phishing("small amount of body text, multiplying score");
		phishingScore *= 1.4;
	}

	var icon = document.querySelector('link[rel="shortcut icon"]');

	if (icon && icon.href) {
		aTest.href = icon.href;



		if (getRootDomain(aTest.hostname) != rd) {
			debug_phishing("icon from external domain found");
			phishingScore += 0.15;
		}
	}

	// finally, if the phishing score is above a threshold, alert the parent process so we can redirect to a warning page

	console.log("min " + minPhishingScore);

	console.log("status", phishingScore);

	if (phishingScore > minPhishingScore) {
		ipc.sendToHost("phishingDetected");
	}

	var scanEnd = performance.now();

	console.log("phishing scan took " + (scanEnd - scanStart) + " milliseconds");

	return true;
}

var didCheckStatus = false;

window.addEventListener("load", function () {
	didCheckStatus = true;
	setTimeout(checkPhishingStatus, 1000);
});

document.addEventListener("DOMContentLoaded", checkPhishingStatus)

//if the load event never fires, we still want to check

setTimeout(function () {
	if (!didCheckStatus) {
		checkPhishingStatus();
	}
}, 2500);
