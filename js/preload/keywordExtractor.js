/* detects terms in the webpage to show as search suggestions */

function isScrolledIntoView (el, doc, win) {
  var rect = el.getBoundingClientRect()
  var x = rect.x, y = rect.y

  if (win.frameElement) {
    // this item is inside an iframe, adjust the coordinates to account for the coordinates of the frame
    var frameRect = win.frameElement.getBoundingClientRect()
    x += frameRect.x, y += frameRect.y
  }

  var isVisible = y > 0 && y < window.innerHeight && x > 0 && x < window.innerWidth

  return isVisible
}

ipc.on('getKeywordsData', function (e) {
  function extractPageText (doc, win) {
    var ignore = ['LINK', 'STYLE', 'SCRIPT', 'NOSCRIPT', 'svg', 'symbol', 'title', 'path', 'style']
    var text = ''
    var pageElements = doc.querySelectorAll('p, h2, h3, h4, li, [name=author], [itemprop=name], .article-author')

    var scrollY = window.scrollY
    for (var i = 0; i < pageElements.length; i++) {
      var el = pageElements[i]

      if (!isScrolledIntoView(pageElements[i], doc, win) || (pageElements[i].tagName === 'META' && scrollY > 500) || pageElements[i].textContent.length < 100 || pageElements[i].querySelector('time, span, div, menu')) {
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

    text = text.replace(/[\n\t]/g, ' ') // remove useless newlines/tabs that increase filesize

    return text
  }

  function extractKeywords (text) {
    /* attempt to identify strings of capitalized words in the text */
    /* TODO add support for languages other than English */

    var words = text
      .replace(/[\u201C\u201D]/g, '"') // convert curly quotes to straight quotes
      .split(/\s+/g)

    // discard empty words
    words = words.filter(function (word) {
      return !!word
    })

    var keywords = []
    var ignoreWords = ['a', 'an', 'the', 'on', 'of', 'or', 'i', 'for']
    var sentenceEndingCharacters = ['.', '."', '?', '?"', '!', '!"']
    var phraseEndingCharcters = [',', ':', ';', '.']
    var thisKeyword = []
    for (var i = 0; i < words.length; i++) {
      // skip the first word after a sentence
      if (words[i - 1] && words[i - 1].length > 2 && sentenceEndingCharacters.find(char => words[i - 1].endsWith(char))) {
        thisKeyword = []
        continue
      }

      // if this word is capitalized (but not all upper-case), it should be part of the keyword
      if (words[i][0].toUpperCase() === words[i][0] && /[A-Z]/g.test(words[i][0]) && words[i] !== words[i].toUpperCase()) {
        thisKeyword.push(words[i])

        // if this word ends with a phrase-ending character, we should jump to saving or discarding
        if (words[i].length > 2 && phraseEndingCharcters.includes(words[i][words[i].length - 1])) {
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
          let keywordText = thisKeyword.join(' ').replace(/^\W+/g, '').replace(/\W+$/g, '').trim()
          if (!keywords.includes(keywordText)) {
            keywords.push(keywordText)
          }
        }
        thisKeyword = []
      } else {
        thisKeyword = []
      }
    }

    return keywords
  }

  if (!pageIsReaderable() && window.location.toString().indexOf('reader/index.html') === -1) {
    return
  }

  var text = extractPageText(document, window)

  var frames = document.querySelectorAll('iframe')

  if (frames) {
    for (var i = 0; i < frames.length; i++) {
      try { // reading contentDocument will throw an error if the frame is not same-origin
        text += ' ' + extractPageText(frames[i].contentDocument, frames[i].contentWindow)
      } catch (e) {}
    }
  }

  var entities = extractKeywords(text)

  ipc.send('keywordsData', {
    entities: entities
  })
})
