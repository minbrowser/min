var websiteNotFound = {
	name: "Server not found",
	message: "Min couldn't find this website. If you think there should be something here, you can <a id='archivesearch-link'>search on archive.org</a> for this page."
}

var sslError = {
	name: "This website is not available",
	message: "Min couldn't connect securely to this website."
}

var dnsError = {
	name: "Website not found",
	messge: "A DNS error occured."
}

var offlineError = {
	name: "You are offline",
	message: "Reconnect to the internet and try again."
}

//list: https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h&sq=package:chromium&type=cs
const errorCodes = {
	"-21": offlineError, //network changed
	"-104": {
		message: "Min couldn't connect to the website."
	},
	"-105": websiteNotFound,
	"-106": offlineError,
	"-107": sslError,
	"-109": websiteNotFound,
	"-110": sslError, //this is actually the error code for "server requested a client certificate", but we don't support that yet,
	"-112": sslError,
	"-113": sslError,
	"-116": sslError,
	"-117": sslError,
	"-200": sslError,
	"-201": {
		name: "This website is not available",
		message: "Min couldn't connect securely to this website. Please make sure your computer's clock is set correctly."
	},
	"-202": sslError,
	"-203": sslError,
	"-204": sslError,
	"-205": sslError,
	"-206": sslError,
	"-207": sslError,
	"-208": sslError,
	"-210": sslError,
	"-211": sslError,
	"-212": sslError,
	"-213": sslError,
	"-300": {
		name: "This address is invalid."
	},
	"-501": sslError,
	"-800": dnsError,
	"-801": dnsError,
	"-802": dnsError,
	"-803": dnsError,
	"-804": dnsError,
	"-805": dnsError,
	"-806": dnsError,
}

var searchParams = new URLSearchParams(window.location.search.replace("?", ""));

//show the error message and detail

var h1 = document.getElementById("error-name");
var h2 = document.getElementById("error-desc");
var button = document.getElementById("ta-button");

var ec = searchParams.get("ec");
var url = searchParams.get("url");

if (errorCodes[ec]) {
	h1.innerHTML += errorCodes[ec].name || "";
	h2.innerHTML += errorCodes[ec].message || "";
} else {
	h1.innerHTML += "An error occured";
}


var link = document.getElementById("archivesearch-link");

if (link) {
	link.href = "https://web.archive.org/web/*/" + url;
}

//if an ssl error occured, "try again" should go to the http:// version, which might work

if (errorCodes[ec] == sslError) {
	url = url.replace("https://", "http://");
}

if (url) {
	button.addEventListener("click", function () {
		window.location = url;
	});
}
