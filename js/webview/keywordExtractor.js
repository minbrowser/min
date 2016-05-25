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

      if ((!isScrolledIntoView(pageElements[i]) && doc === document) || (pageElements[i].tagName === 'META' && scrollY > 500) || pageElements[i].textContent.length < 50 || pageElements[i].querySelector('time, span, div, menu')) {
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

  if (getReaderScore() < 400 && window.location.toString().indexOf('reader/index.html') === -1) {
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

  var nlp = require('nlp_compromise')

  var items = nlp.spot(text, {})

  var entities = []

  items.forEach(function (item) {
    if (item.pos_reason.indexOf('noun_capitalised') === -1) {
      return
    }

    entities.push(item.text.replace(/[^a-zA-Z\s]/g, ''))
  })

  ipc.sendToHost('keywordsData', {
    entities: entities
  })
})
