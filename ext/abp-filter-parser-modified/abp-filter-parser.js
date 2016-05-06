(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.abpFilterParser = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});

	var elementTypes = ["script", "image", "stylesheet", "object", "xmlhttprequest", "objectsubrequest", "subdocument", "document", "other"];

	exports.elementTypes = elementTypes;

	var separatorCharacters = ':?/=^';

	/**
	 * Finds the first separator character in the input string
	 */
	function findFirstSeparatorChar(input, startPos) {
		for (var i = startPos, len = input.length; i < len; i++) {
			if (separatorCharacters.indexOf(input[i]) !== -1) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Obtains the domain index of the input filter line
	 */
	function getDomainIndex(input) {
		var index = input.indexOf(':') + 1;
		while (input[index] === '/') {
			index++;
		}
		return index;
	}

	function getUrlHost(input) {
		var domainIndexStart = getDomainIndex(input);
		var domainIndexEnd = findFirstSeparatorChar(input, domainIndexStart);
		if (domainIndexEnd === -1) {
			domainIndexEnd = input.length;
		}
		return input.substring(domainIndexStart, domainIndexEnd);
	}

	function isThirdPartyHost(baseContextHost, testHost) {
		if (!testHost.endsWith(baseContextHost)) {
			return true;
		}

		var c = testHost[testHost.length - baseContextHost.length - 1];
		return c !== '.' && c !== undefined;
	}

	function isSameOriginHost(baseContextHost, testHost) {
		if (testHost.endsWith(baseContextHost)) {
			var c = testHost[testHost.length - baseContextHost.length - 1];
			return c === '.' || c === undefined;
		} else {
			return false;
		}
	}

	/**
	 * Parses the domain string using the passed in separator and
	 * fills in options.
	 */

	function parseDomains(input, separator, options) {
		options.domains = options.domains || [];
		options.skipDomains = options.skipDomains || [];
		var domains = input.split(separator);
		options.domains = options.domains.concat(domains.filter(function (domain) {
			return domain[0] !== '~';
		}));
		options.skipDomains = options.skipDomains.concat(domains.filter(function (domain) {
			return domain[0] === '~';
		}).map(function (domain) {
			return domain.substring(1);
		}));
	}

	/**
	 * Parses options from the passed in input string
	 */

	function parseOptions(input) {
		var output = {
			binaryOptions: [],
		};

		input.split(',').forEach(function (option) {

			if (option.startsWith('domain=')) {
				var domainString = option.split('=')[1].trim();
				parseDomains(domainString, '|', output);

			} else {

				//the option is an element type to skip
				if (option[0] === "~" && elementTypes.indexOf(option.substring(1)) !== -1) {
					output.skipElementType = option.substring(1);

					//the option is an element type to match
				} else if (elementTypes.indexOf(option) !== -1) {
					output.elementType = option;
				}
			}
		});

		return output;
	}

	function parseFilter(input, parsedFilterData, bloomFilter, exceptionBloomFilter) {
		input = input.trim();

		// Check for comment or nothing
		if (input.length === 0) {
			return false;
		}

		// Check for comments
		var beginIndex = 0;
		if (input[beginIndex] === '[' || input[beginIndex] === '!') {
			parsedFilterData.isComment = true;
			return false;
		}

		// Check for exception instead of filter
		if (input[beginIndex] === '@' && input[beginIndex + 1] === '@') {
			parsedFilterData.isException = true;
			beginIndex = 2;
		}

		// Check for element hiding rules
		var index = input.indexOf('#', beginIndex);
		if (index !== -1 && (input[index + 1] === '#' || input[index + 1] === '@')) {
			return false;
		}

		// Check for options, regex can have options too so check this before regex
		index = input.indexOf('$', beginIndex);
		if (index !== -1) {
			parsedFilterData.options = parseOptions(input.substring(index + 1));
			// Get rid of the trailing options for the rest of the parsing
			input = input.substring(0, index);
		} else {
			parsedFilterData.options = {};
		}

		// Check for a regex
		if (input[beginIndex] === '/' && input[input.length - 1] === '/' && beginIndex !== input.length - 1) {
			parsedFilterData.data = input.slice(beginIndex + 1, -1);
			parsedFilterData.regex = new RegExp(parsedFilterData.data);
			return true;
		}

		// Check if there's some kind of anchoring
		if (input[beginIndex] === '|') {
			// Check for an anchored domain name
			if (input[beginIndex + 1] === '|') {
				parsedFilterData.hostAnchored = true;
				var indexOfSep = findFirstSeparatorChar(input, beginIndex + 1);
				if (indexOfSep === -1) {
					indexOfSep = input.length;
				}
				beginIndex += 2;
				parsedFilterData.host = input.substring(beginIndex, indexOfSep);
			} else {
				parsedFilterData.leftAnchored = true;
				beginIndex++;
			}
		}
		if (input[input.length - 1] === '|') {
			parsedFilterData.rightAnchored = true;
			input = input.substring(0, input.length - 1);
		}

		var d = input.substring(beginIndex) || '*';

		if (d.indexOf("*") !== -1 && !parsedFilterData.leftAnchored && !parsedFilterData.rightAnchored && !parsedFilterData.bothAnchored && !parsedFilterData.hostAnchored) { //the data string will never be used, only the wildcard match parts
			parsedFilterData.wildcardMatchParts = d.split("*");
		} else {
			parsedFilterData.data = d;
		}

		return true;
	}


	/**
	 * Similar to str1.indexOf(filter, startingPos) but with
	 * extra consideration to some ABP filter rules like ^.
	 */
	function indexOfFilter(input, filter, startingPos) {

		if (filter.indexOf("^") == -1) { //no separator characters, no need to do the rest of the parsing
			return input.indexOf(filter, startingPos);
		}

		var filterParts = filter.split('^');
		var index = startingPos,
			beginIndex = -1,
			prefixedSeparatorChar = false;

		var f = 0;
		var part;

		for (var f = 0; f < filterParts.length; f++) {

			part = filterParts[f];

			if (part === '') {
				prefixedSeparatorChar = true;
				continue;
			}

			index = input.indexOf(part, index);
			if (index === -1) {
				return -1;
			}
			if (beginIndex === -1) {
				beginIndex = index;
			}

			if (prefixedSeparatorChar) {
				if (separatorCharacters.indexOf(input[index - 1]) === -1) {
					return -1;
				}
			}
			// If we are in an in between filterPart
			if (f + 1 < filterParts.length &&
				// and we have some chars left in the input past the last filter match
				input.length > index + part.length) {
				if (separatorCharacters.indexOf(input[index + part.length]) === -1) {
					return -1;
				}
			}

			prefixedSeparatorChar = false;
		}
		return beginIndex;
	}

	function filterDataContainsOption(parsedFilterData, option) {
		return parsedFilterData.options && parsedFilterData.options.binaryOptions && parsedFilterData.options.binaryOptions.indexOf(option) !== -1;
	}

	// Determines if there's a match based on the options, this doesn't
	// mean that the filter rule shoudl be accepted, just that the filter rule
	// should be considered given the current context.
	// By specifying context params, you can filter out the number of rules which are
	// considered.
	function matchOptions(parsedFilterData, input, contextParams, currentHost) {

		if (parsedFilterData.options.elementType !== contextParams.elementType && parsedFilterData.options.elementType !== undefined) {
			return false;
		}
		if (parsedFilterData.options.skipElementType === contextParams.elementType && parsedFilterData.options.skipElementType !== undefined) {
			return false;
		}

		// Domain option check
		if (contextParams.domain !== undefined && parsedFilterData.options) {
			if (parsedFilterData.options.domains || parsedFilterData.options.skipDomains) {

				//Min doesn't support getting the root domain yet

				return false;
			}
		}

		// If we're in the context of third-party site, then consider third-party option checks
		if (contextParams['third-party'] !== undefined) {
			// Is the current rule check for third party only?
			if (filterDataContainsOption(parsedFilterData, 'third-party')) {
				var inputHostIsThirdParty = isThirdPartyHost(parsedFilterData.host, currentHost || getUrlHost(input));
				if (inputHostIsThirdParty || !contextParams['third-party']) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Parses the set of filter rules and fills in parserData
	 * @param input filter rules
	 * @param parserData out parameter which will be filled
	 *   with the filters, exceptionFilters and htmlRuleFilters.
	 */

	function parse(input, parserData) {
		var filterCategories = ["regex", "leftAnchored", "rightAnchored", "bothAnchored", "hostAnchored", "wildcard", "indexOf"];

		for (var i = 0; i < filterCategories.length; i++) {
			parserData[filterCategories[i]] = parserData[filterCategories[i]] || [];
		}

		parserData.exceptionFilters = parserData.exceptionFilters || {};

		for (var i = 0; i < filterCategories.length; i++) {
			parserData.exceptionFilters[filterCategories[i]] = parserData.exceptionFilters[filterCategories[i]] || [];
		}

		var filters = input.split("\n");

		for (var i = 0, len = filters.length; i < len; i++) {

			var filter = filters[i];
			var parsedFilterData = {};

			var object;

			if (parseFilter(filter, parsedFilterData)) {

				if (parsedFilterData.isException) {
					object = parserData.exceptionFilters;
				} else {
					object = parserData;
				}

				// Check for a regex match
				if (parsedFilterData.regex) {
					object.regex.push(parsedFilterData);
				} else if (parsedFilterData.leftAnchored) {
					if (parsedFilterData.rightAnchored) {
						object.bothAnchored.push(parsedFilterData);
					} else {
						object.leftAnchored.push(parsedFilterData);
					}
				} else if (parsedFilterData.rightAnchored) {
					object.rightAnchored.push(parsedFilterData);
				} else if (parsedFilterData.hostAnchored) {
					object.hostAnchored.push(parsedFilterData);
				} else if (parsedFilterData.wildcardMatchParts) {
					object.wildcard.push(parsedFilterData);
				} else {
					object.indexOf.push(parsedFilterData);
				}

			}
		}
	}

	function matchesFilters(filters, input, contextParams) {

		var currentHost = getUrlHost(input);

		var i, len, filter;

		//check if the string matches a left anchored filter

		for (i = 0, len = filters.leftAnchored.length; i < len; i++) {

			filter = filters.leftAnchored[i];

			if (input.substring(0, filter.data.length) === filter.data && matchOptions(filter, input, contextParams, currentHost)) {
				//console.log(filter, 1);
				return true;
			}
		}

		//check if the string matches a right anchored filter

		for (i = 0, len = filters.rightAnchored.length; i < len; i++) {

			filter = filters.rightAnchored[i];

			if (input.slice(-filter.data.length) === filter.data && matchOptions(filter, input, contextParams, currentHost)) {
				//console.log(filter, 2);

				return true;
			}
		}

		//check if the string matches a filter with both anchors

		for (i = 0, len = filters.bothAnchored.length; i < len; i++) {

			if (filters.bothAnchored[i].data === input && matchOptions(filters.bothAnchored[i], input, contextParams, currentHost)) {
				//console.log(filter, 3);

				return true;
			}
		}


		//check if the string matches a domain name anchored filter

		for (i = 0, len = filters.hostAnchored.length; i < len; i++) {

			filter = filters.hostAnchored[i];

			if (isSameOriginHost(filter.host, currentHost) && indexOfFilter(input, filter.data) !== -1 && matchOptions(filter, input, contextParams, currentHost)) {
				//console.log(filter, 4);

				return true;
			}
		}


		//check if the string matches an indexOf filter

		for (i = 0, len = filters.indexOf.length; i < len; i++) {

			filter = filters.indexOf[i];

			if (indexOfFilter(input, filter.data, 0) !== -1 && matchOptions(filter, input, contextParams, currentHost)) {
				//console.log(filter, 5);
				return true;
			}

		}

		outer: for (i = 0, len = filters.wildcard.length; i < len; i++) {

			filter = filters.wildcard[i];

			let index = 0;
			for (let part of filter.wildcardMatchParts) {
				let newIndex = indexOfFilter(input, part, index);
				if (newIndex === -1) {
					continue outer;
				}
				index = newIndex + part.length;
			}

			if (matchOptions(filter, input, contextParams, currentHost)) {
				//console.log(filter, 6);
				return true;
			}
		}

		//no filters matched

		return false;

	}

	function matches(filters, input, contextParams) {
		if (matchesFilters(filters, input, contextParams) && !matchesFilters(filters.exceptionFilters, input, contextParams)) {
			return true;
		}
		return false;
	}

	exports.parse = parse;
	exports.matchesFilters = matchesFilters;
	exports.matches = matches;
});
