(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'bloom-filter-js'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports, require('bloom-filter-js'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, global.BloomFilterJS);
		global.abpFilterParser = mod.exports;
	}
})(this, function (exports, _bloomFilterJs) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
	exports.parseDomains = parseDomains;
	exports.parseOptions = parseOptions;
	exports.parseHTMLFilter = parseHTMLFilter;
	exports.parseFilter = parseFilter;
	exports.parse = parse;
	exports.matchesFilter = matchesFilter;
	exports.matches = matches;
	exports.getFingerprint = getFingerprint;

	/**
	 * bitwise mask of different request types
	 */
	var elementTypes = {
		SCRIPT: 1,
		IMAGE: 2,
		STYLESHEET: 4,
		OBJECT: 8,
		XMLHTTPREQUEST: 16,
		OBJECTSUBREQUEST: 32,
		SUBDOCUMENT: 64,
		DOCUMENT: 128,
		OTHER: 256
	};

	exports.elementTypes = elementTypes;
	// Maximum number of cached entries to keep for subsequent lookups
	var maxCached = 100;

	// Maximum number of URL chars to check in match clauses
	var maxUrlChars = 100;

	// Exact size for fingerprints, if you change also change fingerprintRegexs
	var fingerprintSize = 8;

	// Matches protocols at the start of URL's

	var protocolRegex = /^https?:\/\//;

	/**
	 * Maps element types to type mask.
	 */
	var elementTypeMaskMap = new Map([['script', elementTypes.SCRIPT], ['image', elementTypes.IMAGE], ['stylesheet', elementTypes.STYLESHEET], ['object', elementTypes.OBJECT], ['xmlhttprequest', elementTypes.XMLHTTPREQUEST], ['object-subrequest', elementTypes.OBJECTSUBREQUEST], ['subdocument', elementTypes.SUBDOCUMENT], ['document', elementTypes.DOCUMENT], ['other', elementTypes.OTHER]]);

	exports.elementTypeMaskMap = elementTypeMaskMap;
	var separatorCharacters = ':?/=^';

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
			binaryOptions: new Set()
		};
		input.split(',').forEach(function (option) {
			option = option.trim();
			if (option.startsWith('domain=')) {
				var domainString = option.split('=')[1].trim();
				parseDomains(domainString, '|', output);
			} else {
				var optionWithoutPrefix = option[0] === '~' ? option.substring(1) : option;
				if (elementTypeMaskMap.has(optionWithoutPrefix)) {
					if (option[0] === '~') {
						output.skipElementTypeMask |= elementTypeMaskMap.get(optionWithoutPrefix);
					} else {
						output.elementTypeMask |= elementTypeMaskMap.get(optionWithoutPrefix);
					}
				}
				output.binaryOptions.add(option);
			}
		});
		return output;
	}

	/**
	 * Finds the first separator character in the input string
	 */
	function findFirstSeparatorChar(input, startPos) {
		for (var i = startPos; i < input.length; i++) {
			if (separatorCharacters.indexOf(input[i]) !== -1) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Parses an HTML filter and modifies the passed in parsedFilterData
	 * as necessary.
	 *
	 * @param input: The entire input string to consider
	 * @param index: Index of the first hash
	 * @param parsedFilterData: The parsedFilterData object to fill
	 */

	function parseHTMLFilter(input, index, parsedFilterData) {
		var domainsStr = input.substring(0, index);
		parsedFilterData.options = {};
		if (domainsStr.length > 0) {
			parseDomains(domainsStr, ',', parsedFilterData.options);
		}

		// The XOR parsedFilterData.elementHidingException is in case the rule already
		// was specified as exception handling with a prefixed @@
		parsedFilterData.isException = !!(input[index + 1] === '@' ^ parsedFilterData.isException);
		if (input[index + 1] === '@') {
			// Skip passed the first # since @# is 2 chars same as ##
			index++;
		}
		parsedFilterData.htmlRuleSelector = input.substring(index + 2);
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
		parsedFilterData.isException = input[beginIndex] === '@' && input[beginIndex + 1] === '@';
		if (parsedFilterData.isException) {
			beginIndex = 2;
		}

		// Check for element hiding rules
		var index = input.indexOf('#', beginIndex);
		if (index !== -1 && (input[index + 1] === '#' || input[index + 1] === '@')) {
			parseHTMLFilter(input.substring(beginIndex), index - beginIndex, parsedFilterData);
			// HTML rules cannot be combined with other parsing,
			// other than @@ exception marking.
			return true;
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

		parsedFilterData.data = input.substring(beginIndex) || '*';
		// Use the host bloom filter if the filter is a host anchored filter rule with no other data
		if (exceptionBloomFilter && parsedFilterData.isException) {
			exceptionBloomFilter.add(getFingerprint(parsedFilterData.data));
		} else if (bloomFilter) {
			// To check for duplicates
			//if (bloomFilter.exists(getFingerprint(parsedFilterData.data))) {
			// console.log('duplicate found for data: ' + getFingerprint(parsedFilterData.data));
			//}
			// console.log('parse:', parsedFilterData.data, 'fingerprint:', getFingerprint(parsedFilterData.data));
			bloomFilter.add(getFingerprint(parsedFilterData.data));
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
		parserData.bloomFilter = parserData.bloomFilter || new _bloomFilterJs.BloomFilter();
		parserData.exceptionBloomFilter = parserData.exceptionBloomFilter || new _bloomFilterJs.BloomFilter();
		parserData.filters = parserData.filters || [];
		parserData.noFingerprintFilters = parserData.noFingerprintFilters || [];
		parserData.exceptionFilters = parserData.exceptionFilters || [];
		parserData.htmlRuleFilters = parserData.htmlRuleFilters || [];

		var filters = input.split("\n");
		for (var i = 0; i < filters.length; i++) {
			var filter = filters[i];
			var parsedFilterData = {};
			if (parseFilter(filter, parsedFilterData, parserData.bloomFilter, parserData.exceptionBloomFilter)) {
				var fingerprint = getFingerprint(parsedFilterData.data);
				if (parsedFilterData.htmlRuleSelector) {
					parserData.htmlRuleFilters.push(parsedFilterData);
				} else if (parsedFilterData.isException) {
					parserData.exceptionFilters.push(parsedFilterData);
				} else if (fingerprint.length > 0) {
					parserData.filters.push(parsedFilterData);
				} else {
					parserData.noFingerprintFilters.push(parsedFilterData);
				}
			}
		}
		/*
		var startPos = 0;
		var endPos = input.length;
		var newline = '\n';
		while (startPos <= input.length) {
			endPos = input.indexOf(newline, startPos);
			if (endPos === -1) {
				newline = '\r';
				endPos = input.indexOf(newline, startPos);
			}
			if (endPos === -1) {
				endPos = input.length;
			}
			var filter = input.substring(startPos, endPos);
			var parsedFilterData = {};
			if (parseFilter(filter, parsedFilterData, parserData.bloomFilter, parserData.exceptionBloomFilter)) {
				var fingerprint = getFingerprint(parsedFilterData.data);
				if (parsedFilterData.htmlRuleSelector) {
					parserData.htmlRuleFilters.push(parsedFilterData);
				} else if (parsedFilterData.isException) {
					parserData.exceptionFilters.push(parsedFilterData);
				} else if (fingerprint.length > 0) {
					parserData.filters.push(parsedFilterData);
				} else {
					parserData.noFingerprintFilters.push(parsedFilterData);
				}
			}
			startPos = endPos + 1;
		}*/
	}

	/**
	 * Obtains the domain index of the input filter line
	 */
	function getDomainIndex(input) {
		var index = input.indexOf(':');
		++index;
		while (input[index] === '/') {
			index++;
		}
		return index;
	}

	/**
	 * Similar to str1.indexOf(filter, startingPos) but with
	 * extra consideration to some ABP filter rules like ^.
	 */
	function indexOfFilter(input, filter, startingPos) {

		if (filter.length > input.length) {
			return -1;
		}

		if (filter.indexOf("^") == -1) { //no separator characters, no need to do the rest of the parsing
			return input.indexOf(filter, startingPos);
		}

		var filterParts = filter.split('^');
		var index = startingPos;
		var beginIndex = -1;
		var prefixedSeparatorChar = false;

		for (var f = 0; f < filterParts.length; f++) {
			if (filterParts[f] === '') {
				prefixedSeparatorChar = true;
				continue;
			}

			index = input.indexOf(filterParts[f], index);
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
				input.length > index + filterParts[f].length) {
				if (separatorCharacters.indexOf(input[index + filterParts[f].length]) === -1) {
					return -1;
				}
			}

			prefixedSeparatorChar = false;
		}
		return beginIndex;
	}

	function getUrlHost(input) {
		var domainIndexStart = getDomainIndex(input);
		var domainIndexEnd = findFirstSeparatorChar(input, domainIndexStart);
		if (domainIndexEnd === -1) {
			domainIndexEnd = input.length;
		}
		return input.substring(domainIndexStart, domainIndexEnd);
	}

	function filterDataContainsOption(parsedFilterData, option) {
		return parsedFilterData.options && parsedFilterData.options.binaryOptions && parsedFilterData.options.binaryOptions.has(option);
	}

	function isThirdPartyHost(baseContextHost, testHost) {
		if (!testHost.endsWith(baseContextHost)) {
			return true;
		}

		var c = testHost[testHost.length - baseContextHost.length - 1];
		return c !== '.' && c !== undefined;
	}

	// Determines if there's a match based on the options, this doesn't
	// mean that the filter rule shoudl be accepted, just that the filter rule
	// should be considered given the current context.
	// By specifying context params, you can filter out the number of rules which are
	// considered.
	function matchOptions(parsedFilterData, input, params) {
		var contextParams = params || {};

		if (contextParams.elementTypeMask !== undefined && parsedFilterData.options) {
			if (parsedFilterData.options.elementTypeMask !== undefined && !(parsedFilterData.options.elementTypeMask & contextParams.elementTypeMask)) {
				return false;
			}
			if (parsedFilterData.options.skipElementTypeMask !== undefined && parsedFilterData.options.skipElementTypeMask & contextParams.elementTypeMask) {
				return false;
			}
		}

		// Domain option check
		if (contextParams.domain !== undefined && parsedFilterData.options) {
			if (parsedFilterData.options.domains || parsedFilterData.options.skipDomains) {
				// Get the domains that should be considered
				let shouldBlockDomains = parsedFilterData.options.domains.filter((domain) =>
					!isThirdPartyHost(domain, contextParams.domain));

				let shouldSkipDomains = parsedFilterData.options.skipDomains.filter((domain) =>
					!isThirdPartyHost(domain, contextParams.domain));
				// Handle cases like: example.com|~foo.example.com should llow for foo.example.com
				// But ~example.com|foo.example.com should block for foo.example.com
				let leftOverBlocking = shouldBlockDomains.filter((shouldBlockDomain) =>
					shouldSkipDomains.every((shouldSkipDomain) =>
						isThirdPartyHost(shouldBlockDomain, shouldSkipDomain)));
				let leftOverSkipping = shouldSkipDomains.filter((shouldSkipDomain) =>
					shouldBlockDomains.every((shouldBlockDomain) =>
						isThirdPartyHost(shouldSkipDomain, shouldBlockDomain)));

				// If we have none left over, then we shouldn't consider this a match
				if (shouldBlockDomains.length === 0 && parsedFilterData.options.domains.length !== 0 ||
					shouldBlockDomains.length > 0 && leftOverBlocking.length === 0 ||
					shouldSkipDomains.length > 0 && leftOverSkipping.length > 0) {
					return false;
				}
			}
		}

		// If we're in the context of third-party site, then consider third-party option checks
		if (contextParams['third-party'] !== undefined) {
			// Is the current rule check for third party only?
			if (filterDataContainsOption(parsedFilterData, 'third-party')) {
				var inputHostIsThirdParty = isThirdPartyHost(parsedFilterData.host, getUrlHost(input));
				if (inputHostIsThirdParty || !contextParams['third-party']) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Given an individual parsed filter data determines if the input url should block.
	 */

	function matchesFilter(parsedFilterData, input, params, cachedData) {
		var contextParams = params || {};
		var cachedInputData = cachedData || {};

		if (!matchOptions(parsedFilterData, input, contextParams)) {
			return false;
		}

		// Check for a regex match
		if (parsedFilterData.regex) {
			return parsedFilterData.regex.test(input);
		}

		// Check for both left and right anchored
		if (parsedFilterData.leftAnchored) {
			if (parsedFilterData.rightAnchored) {
				return parsedFilterData.data === input;
			}
			return input.substring(0, parsedFilterData.data.length) === parsedFilterData.data;
		}

		// Check for right anchored
		if (parsedFilterData.rightAnchored) {
			return input.slice(-parsedFilterData.data.length) === parsedFilterData.data;
		}

		// Check for domain name anchored
		if (parsedFilterData.hostAnchored) {
			return !isThirdPartyHost(parsedFilterData.host, cachedInputData.currentHost) && indexOfFilter(input, parsedFilterData.data) !== -1;
		}

		// Wildcard match comparison
		let parts = parsedFilterData.data.split('*');
		let index = 0;
		for (let part of parts) {
			let newIndex = indexOfFilter(input, part, index);
			if (newIndex === -1) {
				return false;
			}
			index = newIndex + part.length;
		}

		return true;
	}

	function hasMatchingFilters(filterList, input, contextParams, cachedInputData) {
		for (var i = 0, len = filterList.length; i < len; i++) {
			if (matchesFilter(filterList[i], input, contextParams, cachedInputData)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Using the parserData rules will try to see if the input URL should be blocked or not
	 * @param parserData The filter data obtained from a call to parse
	 * @param input The input URL
	 * @return true if the URL should be blocked
	 */

	function matches(parserData, input) {
		var contextParams = arguments[2] === undefined ? {} : arguments[2];
		var cachedInputData = arguments[3] === undefined ? {} : arguments[3];

		cachedInputData.bloomNegativeCount = cachedInputData.bloomNegativeCount || 0;
		cachedInputData.bloomPositiveCount = cachedInputData.bloomPositiveCount || 0;
		cachedInputData.notMatchCount = cachedInputData.notMatchCount || 0;
		cachedInputData.bloomFalsePositiveCount = cachedInputData.bloomFalsePositiveCount || 0;

		var hasMatchingNoFingerprintFilters = undefined;
		var cleanedInput = input.replace(protocolRegex, '');
		if (cleanedInput.length > maxUrlChars) {
			cleanedInput = cleanedInput.substring(0, maxUrlChars);
		}

		cachedInputData.currentHost = getUrlHost(input);

		if (parserData.bloomFilter) {
			if (!parserData.bloomFilter.substringExists(cleanedInput, fingerprintSize)) {
				cachedInputData.bloomNegativeCount++;
				cachedInputData.notMatchCount++;
				// console.log('early return because of bloom filter check!');
				hasMatchingNoFingerprintFilters = hasMatchingFilters(parserData.noFingerprintFilters, input, contextParams, cachedInputData);

				if (!hasMatchingNoFingerprintFilters) {
					return false;
				}
			}
			// console.log('looked for url in bloom filter and it said yes:', cleaned);
		}
		cachedInputData.bloomPositiveCount++;

		// console.log('not early return: ', input);
		cachedInputData.missList = cachedInputData.missList || [];
		if (cachedInputData.missList.length > maxCached) {
			cachedInputData.missList = cachedInputData.missList.splice(1);
		}
		if (cachedInputData.missList.includes(input)) {
			cachedInputData.notMatchCount++;
			// console.log('positive match for input: ', input);
			return false;
		}

		if (hasMatchingFilters(parserData.filters, input, contextParams, cachedInputData) || hasMatchingNoFingerprintFilters === true || hasMatchingNoFingerprintFilters === undefined && hasMatchingFilters(parserData.noFingerprintFilters, input, contextParams, cachedInputData)) {
			// Check for exceptions only when there's a match because matches are
			// rare compared to the volume of checks
			var exceptionBloomFilterMiss = parserData.exceptionBloomFilter && !parserData.exceptionBloomFilter.substringExists(cleanedInput, fingerprintSize);
			if (!exceptionBloomFilterMiss || hasMatchingFilters(parserData.exceptionFilters, input, contextParams, cachedInputData)) {
				cachedInputData.notMatchCount++;
				return false;
			}
			return true;
		}

		// The bloom filter had a false positive, se we checked for nothing! :'(
		// This is probably (but not always) an indication that the fingerprint selection should be tweaked!
		cachedInputData.missList.push(input);
		cachedInputData.notMatchCount++;
		cachedInputData.bloomFalsePositiveCount++;
		// console.log('positive match for input: ', input);
		return false;
	}

	/**
	 * Obtains a fingerprint for the specified filter
	 */

	function getFingerprint(str) {
		if (!str) {
			return "";
		}
		var r = "";
		for (var i = 0; i < str.length; i++) {
			if (i % 2 == 0) {
				r += str[i];
			}
		}
		if (r.length == fingerprintSize) {
			return r;
		} else {
			return "";
		}
	}
});

// console.log('good-fingerprint:', sub, 'for url:', str);

// console.log('checking again for str:', str, 'result:', result[1]);

// console.log('checking again for str, no result');
//# sourceMappingURL=abp-filter-parser.js.map
