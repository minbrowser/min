;(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory)
  } else if (typeof exports !== 'undefined') {
    factory(exports)
  } else {
    var mod = {
      exports: {}
    }
    factory(mod.exports)
    global.abpFilterParser = mod.exports
  }
})(this, function (exports) {
  'use strict'

  Object.defineProperty(exports, '__esModule', {
    value: true
  })

  var elementTypes = ['script', 'image', 'stylesheet', 'object', 'xmlhttprequest', 'objectsubrequest', 'subdocument', 'document', 'other']

  var separatorCharacters = ':?/=^'

  /**
   * Finds the first separator character in the input string
   */
  function findFirstSeparatorChar (input, startPos) {
    for (var i = startPos, len = input.length; i < len; i++) {
      if (separatorCharacters.indexOf(input[i]) !== -1) {
        return i
      }
    }
    return -1
  }

  /**
   * Obtains the domain index of the input filter line
   */
  function getDomainIndex (input) {
    var index = input.indexOf(':') + 1
    while (input[index] === '/') {
      index++
    }
    return index
  }

  function getUrlHost (input) {
    var domainIndexStart = getDomainIndex(input)
    var domainIndexEnd = findFirstSeparatorChar(input, domainIndexStart)
    if (domainIndexEnd === -1) {
      domainIndexEnd = input.length
    }
    return input.substring(domainIndexStart, domainIndexEnd)
  }

  function isThirdPartyHost (baseContextHost, testHost) {
    if (!testHost.endsWith(baseContextHost)) {
      return true
    }

    var c = testHost[testHost.length - baseContextHost.length - 1]
    return c !== '.' && c !== undefined
  }

  function isSameOriginHost (baseContextHost, testHost) {
    if (testHost.slice(-baseContextHost.length) === baseContextHost) {
      var c = testHost[testHost.length - baseContextHost.length - 1]
      return c === '.' || c === undefined
    } else {
      return false
    }
  }

  /**
   * Parses the domain string using the passed in separator and
   * fills in options.
   */

  function parseDomains (input, separator, options) {
    var domains = input.split(separator)
    options.domains = domains.filter(function (domain) {
      return domain[0] !== '~'
    })
    options.skipDomains = domains.filter(function (domain) {
      return domain[0] === '~'
    }).map(function (domain) {
      return domain.substring(1)
    })
  }

  /**
   * Parses options from the passed in input string
   */

  function parseOptions (input) {
    var output = {}

    input.split(',').forEach(function (option) {
      if (option.startsWith('domain=')) {
        var domainString = option.split('=')[1].trim()
        parseDomains(domainString, '|', output)
      } else {

        // the option is an element type to skip
        if (option[0] === '~' && elementTypes.indexOf(option.substring(1)) !== -1) {
          output.skipElementType = option.substring(1)

        // the option is an element type to match
        } else if (elementTypes.indexOf(option) !== -1) {
          output.elementType = option
        }
      }
    })

    return output
  }

  /* creates a trie */

  function trie () {
    this.data = {}
  }

  trie.prototype.add = function (string, stringData) {
    var data = this.data

    for (var i = 0, len = string.length; i < len; i++) {
      var char = string[i]

      if (!data[char]) {
        data[char] = {}
      }

      data = data[char]
    }
    if (data._d) {
      data._d.push(stringData)
    } else {
      data._d = [stringData]
    }
  }

  trie.prototype.getSubstringsOf = function (string) {
    var root = this.data
    var substrings = []
    // loop through each character in the string

    outer: for (var i = 0; i < string.length; i++) {
      var data = root[string[i]]
      if (!data) {
        continue
      }
      for (var x = i + 1; x < string.length; x++) {
        var char = string[x]
        if (data[char]) {
          data = data[char]
          if (data._d) {
            substrings = substrings.concat(data._d)
          }
        } else {
          continue outer
        }
      }
    }

    return substrings
  }

  function parseFilter (input, parsedFilterData) {
    input = input.trim()

    var len = input.length

    // Check for comment or nothing
    if (len === 0) {
      return false
    }

    // Check for comments
    if (input[0] === '[' || input[0] === '!') {
      return false
    }

    var beginIndex = 0

    // Check for exception instead of filter
    if (input[0] === '@' && input[1] === '@') {
      parsedFilterData.isException = true
      beginIndex = 2
    }

    // Check for element hiding rules
    var index = input.indexOf('#', beginIndex)
    if (index !== -1 && (input[index + 1] === '#' || input[index + 1] === '@')) {
      return false
    }

    // Check for options, regex can have options too so check this before regex
    index = input.indexOf('$', beginIndex)
    if (index !== -1) {
      parsedFilterData.options = parseOptions(input.substring(index + 1))
      // Get rid of the trailing options for the rest of the parsing
      input = input.substring(0, index)
      len = index
    }

    // Check for a regex
    if (input[beginIndex] === '/' && input[len - 1] === '/' && beginIndex !== len - 1) {
      parsedFilterData.data = input.slice(beginIndex + 1, -1)
      parsedFilterData.regex = new RegExp(parsedFilterData.data)
      return true
    }

    // Check if there's some kind of anchoring
    if (input[beginIndex] === '|') {
      // Check for an anchored domain name
      if (input[beginIndex + 1] === '|') {
        parsedFilterData.hostAnchored = true
        var indexOfSep = findFirstSeparatorChar(input, beginIndex + 1)
        if (indexOfSep === -1) {
          indexOfSep = len
        }
        beginIndex += 2
        parsedFilterData.host = input.substring(beginIndex, indexOfSep)
        parsedFilterData.data = input.substring(beginIndex)
      } else {
        parsedFilterData.leftAnchored = true
        beginIndex++
        parsedFilterData.data = input.substring(beginIndex)
      }
    }
    if (input[len - 1] === '|') {
      parsedFilterData.rightAnchored = true
      input = input.substring(0, len - 1)
      parsedFilterData.data = input.substring(beginIndex)
    }

    // for plainString and wildcard filters

    if (!parsedFilterData.data) {
      if (input.indexOf('*') === -1) {
        parsedFilterData.data = input.substring(beginIndex)
      } else {
        parsedFilterData.wildcardMatchParts = input.split('*')
      }
    }

    return true
  }

  /**
   * Similar to str1.indexOf(filter, startingPos) but with
   * extra consideration to some ABP filter rules like ^.
   */
  function indexOfFilter (input, filter, startingPos) {
    if (filter.indexOf('^') == -1) { // no separator characters, no need to do the rest of the parsing
      return input.indexOf(filter, startingPos)
    }

    var filterParts = filter.split('^')
    var index = startingPos,
      beginIndex = -1,
      prefixedSeparatorChar = false

    var f = 0
    var part

    for (var f = 0; f < filterParts.length; f++) {
      part = filterParts[f]

      if (part === '') {
        prefixedSeparatorChar = true
        continue
      }

      index = input.indexOf(part, index)
      if (index === -1) {
        return -1
      }
      if (beginIndex === -1) {
        beginIndex = index
      }

      if (prefixedSeparatorChar) {
        if (separatorCharacters.indexOf(input[index - 1]) === -1) {
          return -1
        }
      }
      // If we are in an in between filterPart
      if (f + 1 < filterParts.length &&
        // and we have some chars left in the input past the last filter match
        input.length > index + part.length) {
        if (separatorCharacters.indexOf(input[index + part.length]) === -1) {
          return -1
        }
      }

      prefixedSeparatorChar = false
    }
    return beginIndex
  }

  // Determines if there's a match based on the options, this doesn't
  // mean that the filter rule shoudl be accepted, just that the filter rule
  // should be considered given the current context.
  // By specifying context params, you can filter out the number of rules which are
  // considered.
  function matchOptions (filterOptions, input, contextParams, currentHost) {
    if (!filterOptions) {
      return true
    }
    if (filterOptions.elementType !== contextParams.elementType && filterOptions.elementType !== undefined) {
      return false
    }
    if (filterOptions.skipElementType === contextParams.elementType && filterOptions.skipElementType !== undefined) {
      return false
    }

    // Domain option check
    if (contextParams.domain !== undefined) {
      if (filterOptions.domains || filterOptions.skipDomains) {

        // Min doesn't support getting the root domain yet

        return false
      }
    }

    return true
  }

  /**
   * Parses the set of filter rules and fills in parserData
   * @param input filter rules
   * @param parserData out parameter which will be filled
   *   with the filters, exceptionFilters and htmlRuleFilters.
   */

  function parse (input, parserData) {
    var arrayFilterCategories = ['regex', 'leftAnchored', 'rightAnchored', 'bothAnchored', 'wildcard', 'indexOf']
    var objectFilterCategories = ['hostAnchored']
    var trieFilterCategories = ['plainString']

    parserData.exceptionFilters = parserData.exceptionFilters || {}

    for (var i = 0; i < arrayFilterCategories.length; i++) {
      parserData[arrayFilterCategories[i]] = parserData[arrayFilterCategories[i]] || []
      parserData.exceptionFilters[arrayFilterCategories[i]] = parserData.exceptionFilters[arrayFilterCategories[i]] || []
    }

    for (var i = 0; i < objectFilterCategories.length; i++) {
      parserData[objectFilterCategories[i]] = parserData[objectFilterCategories[i]] || {}
      parserData.exceptionFilters[objectFilterCategories[i]] = parserData.exceptionFilters[objectFilterCategories[i]] || {}
    }


    for (var i = 0; i < trieFilterCategories.length; i++) {
      parserData[trieFilterCategories[i]] = parserData[trieFilterCategories[i]] || new trie()
      parserData.exceptionFilters[trieFilterCategories[i]] = parserData.exceptionFilters[trieFilterCategories[i]] || new trie()
    }

    var filters = input.split('\n')

    for (var i = 0, len = filters.length; i < len; i++) {
      var filter = filters[i]
      var parsedFilterData = {}

      var object

      if (parseFilter(filter, parsedFilterData)) {
        if (parsedFilterData.isException) {
          object = parserData.exceptionFilters
        } else {
          object = parserData
        }

        // Check for a regex match
        if (parsedFilterData.regex) {
          object.regex.push(parsedFilterData)
        } else if (parsedFilterData.leftAnchored) {
          if (parsedFilterData.rightAnchored) {
            object.bothAnchored.push(parsedFilterData)
          } else {
            object.leftAnchored.push(parsedFilterData)
          }
        } else if (parsedFilterData.rightAnchored) {
          object.rightAnchored.push(parsedFilterData)
        } else if (parsedFilterData.hostAnchored) {
          var ending = parsedFilterData.host.slice(-2)

          if (object.hostAnchored[ending]) {
            object.hostAnchored[ending].push(parsedFilterData)
          } else {
            object.hostAnchored[ending] = [parsedFilterData]
          }
        } else if (parsedFilterData.wildcardMatchParts) {
          object.wildcard.push(parsedFilterData)
        } else if (parsedFilterData.data.indexOf('^') === -1) {
          object.plainString.add(parsedFilterData.data, parsedFilterData.options)
        } else {
          object.indexOf.push(parsedFilterData)
        }
      }
    }
  }

  function matchesFilters (filters, input, contextParams) {
    var currentHost = getUrlHost(input)

    var i, len, filter

    // check if the string matches a left anchored filter

    for (i = 0, len = filters.leftAnchored.length; i < len; i++) {
      filter = filters.leftAnchored[i]

      if (input.startsWith(filter.data) && matchOptions(filter.options, input, contextParams, currentHost)) {
        // console.log(filter, 1)
        return true
      }
    }

    // check if the string matches a right anchored filter

    for (i = 0, len = filters.rightAnchored.length; i < len; i++) {
      filter = filters.rightAnchored[i]

      if (input.endsWith(filter.data) && matchOptions(filter.options, input, contextParams, currentHost)) {
        // console.log(filter, 2)

        return true
      }
    }

    // check if the string matches a filter with both anchors

    for (i = 0, len = filters.bothAnchored.length; i < len; i++) {
      if (filters.bothAnchored[i].data === input && matchOptions(filters.bothAnchored[i].options, input, contextParams, currentHost)) {
        // console.log(filter, 3)

        return true
      }
    }

    // get all of the host anchored filters with the same domain ending as the current domain
    var hostFiltersToCheck = filters.hostAnchored[currentHost.slice(-2)]

    if (hostFiltersToCheck) {
    // check if the string matches a domain name anchored filter

      for (i = 0, len = hostFiltersToCheck.length; i < len; i++) {
        filter = hostFiltersToCheck[i]

        if (isSameOriginHost(filter.host, currentHost) && indexOfFilter(input, filter.data) !== -1 && matchOptions(filter.options, input, contextParams, currentHost)) {
        // console.log(filter, 4)

          return true
        }
      }
    }

    // check if the string matches a string filter

    var plainStringMatches = filters.plainString.getSubstringsOf(input)

    if (plainStringMatches.length !== 0) {
      var len = plainStringMatches.length

      for (var i = 0; i < len; i++) {
        if (matchOptions(plainStringMatches[i], input, contextParams, currentHost)) {
          return true
        }
      }
    }

    // check if the string matches an indexOf filter

    for (i = 0, len = filters.indexOf.length; i < len; i++) {
      filter = filters.indexOf[i]

      if (indexOfFilter(input, filter.data, 0) !== -1 && matchOptions(filter.options, input, contextParams, currentHost)) {
        // console.log(filter, 5)
        return true
      }
    }

    outer: for (i = 0, len = filters.wildcard.length; i < len; i++) {
      filter = filters.wildcard[i]

      // most filters won't match on the first part, so there is no point in entering the loop
      if (indexOfFilter(input, filter.wildcardMatchParts[0], 0) === -1) {
        continue outer
      }

      let index = 0
      for (let part of filter.wildcardMatchParts) {
        let newIndex = indexOfFilter(input, part, index)
        if (newIndex === -1) {
          continue outer
        }
        index = newIndex + part.length
      }

      if (matchOptions(filter.options, input, contextParams, currentHost)) {
        // console.log(filter, 6)
        return true
      }
    }

    // no filters matched

    return false
  }

  function matches (filters, input, contextParams) {
    if (matchesFilters(filters, input, contextParams) && !matchesFilters(filters.exceptionFilters, input, contextParams)) {
      return true
    }
    return false
  }

  exports.parse = parse
  exports.matchesFilters = matchesFilters
  exports.matches = matches
})
