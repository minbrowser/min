var urlParser = {
	searchBaseURL: "https://duckduckgo.com/?q=%s",
	isUrl: function (url) {
		return url.indexOf("http://") == 0 || url.indexOf("https://") == 0 || url.indexOf("file://") == 0 || url.indexOf("about:") == 0 || url.indexOf("chrome:") == 0 || url.indexOf("data:") == 0;
	},
	isSystemURL: function (url) {
		return url.indexOf("chrome") == 0 || url.indexOf("about:") == 0;
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
