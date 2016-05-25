function autocomplete (input, text, strings) {
  for (var i = 0; i < strings.length; i++) {
    // check if the item can be autocompleted
    if (strings[i].toLowerCase().indexOf(text.toLowerCase()) === 0) {
      input.value = strings[i]
      input.setSelectionRange(text.length, strings[i].length)

      return {
        valid: true,
        matchIndex: i
      }
    }
  }
  return {
    valid: false
  }
}

// autocompletes based on a result item
// returns: 1 - the exact URL was autocompleted, 0 - the domain was autocompleted, -1: nothing was autocompleted
function autocompleteURL (item, input) {
  var text = getValue(input)

  var url = new URL(item.url)
  var hostname = url.hostname

  // the different variations of the URL we can autocomplete
  var possibleAutocompletions = [
    // we start with the domain
    hostname,
    // if that doesn't match, try the hostname without the www instead. The regex requires a slash at the end, so we add one, run the regex, and then remove it
    (hostname + '/').replace(urlParser.startingWWWRegex, '$1').replace('/', ''),
    // then try the whole URL
    urlParser.prettyURL(item.url),
    // then try the URL with querystring
    urlParser.removeProtocol(item.url),
    // then just try the URL with protocol
    item.url
  ]

  var autocompleteResult = autocomplete(input, text, possibleAutocompletions)

  if (!autocompleteResult.valid) {
    return -1
  } else if (autocompleteResult.matchIndex < 2 && url.pathname !== '/') {
    return 0
  } else {
    return 1
  }
}
