var urlParser = require('util/urlParser.js')

function autocomplete(input, completions) {
  // if there is text after the selection, we can never autocomplete
  if (input.selectionEnd !== input.value.length) {
    return {
      valid: false
    }
  }

  var text = input.value.substring(0, input.selectionStart)

  for (var i = 0; i < completions.length; i++) {
    // check if the item can be autocompleted
    if (completions[i][0].toLowerCase().indexOf(text.toLowerCase()) === 0) {
      input.value = text + completions[i][0].substring(input.selectionStart)
      input.setSelectionRange(text.length, completions[i][0].length)
      input.setAttribute('data-autocomplete-text', completions[i][0])
      if (completions[i][1]) {
        input.setAttribute('data-autocomplete-ref', completions[i][1])
      } else {
        input.removeAttribute('data-autocomplete-ref')
      }

      return {
        valid: true,
        matchIndex: i
      }
    }
  }
  input.removeAttribute('data-autocomplete-text')
  input.removeAttribute('data-autocomplete-ref')
  return {
    valid: false
  }
}

// autocompletes based on a result item
// returns: 1 - the exact URL was autocompleted, 0 - the domain was autocompleted, -1: nothing was autocompleted
function autocompleteURL(input, url) {
  var urlObj = new URL(url)
  var hostname = urlObj.hostname

  // the different variations of the URL we can autocomplete
  var possibleAutocompletions = [
    // we start with the domain, including any non-standard ports (such as localhost:8080)
    [
      hostname + (urlObj.port ? ':' + urlObj.port : ''),
      new URL(urlObj.protocol + '//' + hostname + (urlObj.port ? ':' + urlObj.port : ''))
    ],
    // if that doesn't match, try the hostname without the www instead. The regex requires a slash at the end, so we add one, run the regex, and then remove it
    [
      (hostname + '/').replace(urlParser.startingWWWRegex, '$1').replace('/', ''),
      new URL(urlObj.protocol + '//' + (hostname + '/').replace(urlParser.startingWWWRegex, '$1').replace('/', ''))
    ],
    // then try the whole URL
    [
      urlParser.prettyURL(url),
      (() => {
        try {
          return new URL(urlParser.prettyURL(url))
        } catch (e) { return null }
      })()
    ],
    // then try the URL with querystring
    [
      urlParser.basicURL(url),
      (() => {
        try {
          return new URL(urlParser.basicURL(url))
        } catch (e) { return null }
      })()
    ],
    // then just try the URL with protocol
    [
      url,
      (() => {
        try {
          return new URL(url)
        } catch (e) { return null }
      })()
    ]
  ]
    .map(completion => [completion[0], completion[1] ? completion[1].toString() : null])

  var autocompleteResult = autocomplete(input, possibleAutocompletions)

  if (!autocompleteResult.valid) {
    return -1
  } else if (autocompleteResult.matchIndex < 2 && urlObj.pathname !== '/') {
    return 0
  } else {
    return 1
  }
}

module.exports = { autocomplete, autocompleteURL }
