/* detects terms in the webpage to show as search suggestions */

function isScrolledIntoView (el) { // http://stackoverflow.com/a/22480938/4603285
  var elemTop = el.getBoundingClientRect().top
  var elemBottom = el.getBoundingClientRect().bottom

  var isVisible = elemTop < window.innerHeight && elemBottom >= 0
  return isVisible
}

ipc.on('getKeywordsData', function (e) {
  function extractPageText (doc) {
    var ignore = ['LINK', 'STYLE', 'SCRIPT', 'NOSCRIPT', 'svg', 'symbol', 'title', 'path', 'style']
    var text = ''
    var pageElements = doc.querySelectorAll('p, h2, h3, h4, li, [name=author], [itemprop=name], .article-author')

    var scrollY = window.scrollY
    for (var i = 0; i < pageElements.length; i++) {
      var el = pageElements[i]

      if ((!isScrolledIntoView(pageElements[i]) && doc === document) || (pageElements[i].tagName === 'META' && scrollY > 500) || pageElements[i].textContent.length < 100 || pageElements[i].querySelector('time, span, div, menu')) {
        continue
      }

      if (ignore.indexOf(el.tagName) === -1) {
        var elText = el.textContent || el.content

        if (pageElements[i - 1] && /\.\s*$/g.test(pageElements[i - 1].textContent)) {
          text += ' ' + elText
        } else {
          text += '. ' + elText
        }
      }
    }

    text = text.replace(/[\n\t]/g, '') // remove useless newlines/tabs that increase filesize

    return text
  }

  function extractKeywords (text) {
    /* attempt to identify strings of capitalized words in the text */
    /* TODO add support for languages other than English */

    var words = text.split(/\s+/g)
    // discard empty words
    words = words.filter(function (word) {
      return !!word
    })

    var keywords = []
    var ignoreWords = ['a', 'an', 'the', 'on', 'of', 'or', 'i']
    var sentenceEndingCharacters = ['.', '?', '!']
    var phraseEndingCharcters = [',', ':', ';', '.']
    var thisKeyword = []
    for (var i = 0; i < words.length; i++) {
      // skip the first word after a sentence
      if (words[i - 1] && words[i - 1].length > 1 && sentenceEndingCharacters.includes(words[i - 1][words[i - 1].length - 1])) {
        thisKeyword = []
        continue
      }

      // if this word is capitalized, it should be part of the keyword
      if (words[i][0].toUpperCase() === words[i][0] && /[A-Z]/g.test(words[i][0])) {
        thisKeyword.push(words[i])

        // if this word ends with a phrase-ending character, we should jump to saving or discarding
        if (words[i].length > 1 && phraseEndingCharcters.includes(words[i][words[i].length - 1])) {
        } else {
          // otherwise, we should skip the save-or-discard and continue adding words
          continue
        }
      }

      // add ignorable words to an existing keyword
      if (thisKeyword.length > 0 && ignoreWords.includes(words[i].toLowerCase())) {
        thisKeyword.push(words[i])
        continue
      }

      // otherwise, decide whether to keep the keyword.
      // only keep it if it is > 1 word
      if (thisKeyword.length > 1) {
        // discard ignorable words at the end
        while(ignoreWords.includes(thisKeyword[thisKeyword.length - 1].toLowerCase())) {
          thisKeyword.pop()
        }
        if (thisKeyword.length > 1) { // make sure there are still two words left after discarding ignorables
          keywords.push(thisKeyword.join(' ').replace(/^\W+/g, '').replace(/\W+$/g, ''))
        }
        thisKeyword = []
      } else {
        thisKeyword = []
      }
    }

    return keywords.slice(0, 5)
  }

  if (!pageIsReaderable() && window.location.toString().indexOf('reader/index.html') === -1) {
    return
  }

  var text = extractPageText(document)

  var frames = document.querySelectorAll('iframe')

  if (frames) {
    for (var i = 0; i < frames.length; i++) {
      try { // reading contentDocument will throw an error if the frame is not same-origin
        text += ' ' + extractPageText(frames[i].contentDocument)
      } catch (e) {}
    }
  }

  var entities = extractKeywords(text)

  ipc.send('keywordsData', {
    entities: entities
  })
})
