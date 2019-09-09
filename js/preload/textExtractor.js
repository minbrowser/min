/* send bookmarks data.  */

function isVisible (el) {
  // https://github.com/jquery/jquery/blob/305f193aa57014dc7d8fa0739a3fefd47166cd44/src/css/hiddenVisibleSelectors.js
  return el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)
}

function extractPageText (doc, win) {
  var maybeNodes = [].slice.call(doc.body.childNodes)
  var textNodes = []

  var ignore = 'link, style, script, noscript, .hidden, [class*="-hidden"], .visually-hidden, .visuallyhidden, [role=presentation], [hidden], [style*="display:none"], [style*="display: none"], .ad, .dialog, .modal, select, svg, details:not([open])'

  while(maybeNodes.length) {
    var node = maybeNodes[0]

    // remove the node from the list of nodes to check
    maybeNodes.shift()

    // if the node should be ignored, skip it and all of it's child nodes
    if (node.matches && node.matches(ignore)) {
      continue
    }

    // if the node is a text node, add it to the list of text nodes

    if (node.nodeType === 3) {
      textNodes.push(node)
      continue
    }

    if (!isVisible(node)) {
      continue
    }

    // otherwise, add the node's text nodes to the list of text, and the other child nodes to the list of nodes to check
    var childNodes = node.childNodes
    var cnl = childNodes.length

    for (var i = 0; i < cnl; i++) {
      var childNode = childNodes[i]
      // text node
      if (childNode.nodeType === 3) {
        textNodes.push(childNode)
      } else {
        maybeNodes.unshift(childNode)
      }
    }
  }

  var text = ''

  var tnl = textNodes.length

  // combine the text of all of the accepted text nodes together
  for (var i = 0; i < tnl; i++) {
    text += textNodes[i].textContent + ' '
  }

  // special meta tags

  var mt = doc.head.querySelector('meta[name=description]')

  if (mt) {
    text += ' ' + mt.content
  }

  text = text.trim()

  text = text.replace(/[\n\t]/g, ' ') // remove useless newlines/tabs that increase filesize

  text = text.replace(/\s{2,}/g, ' ') // collapse multiple spaces into one
  return text
}

function getPageData (cb) {
  requestAnimationFrame(function () {
    /* also parse special metadata: price, rating, location, cooking time */

    var price, rating, location, cookTime

    // pricing

    var priceEl = document.querySelector('[itemprop=price], .price, .offer-price, #priceblock_ourprice, .discounted-price')
    var currencyEl = document.querySelector('[itemprop=priceCurrency], [property=priceCurrency]')

    if (priceEl) {
      price = priceEl.getAttribute('content') || priceEl.textContent
    }

    if (currencyEl) {
      var currency = currencyEl.getAttribute('content') || currencyEl.textContent
    }

    if (!/\d/g.test(price)) { // if the price doesn't contain a number, it probably isn't accurate
      price = undefined
    }

    var currencySymbolMap = {
      'USD': '$',
      'EUR': '€',
    // TODO add support for more currencies
    }

    if (price && /^[\d\.]+$/g.test(price) && currencySymbolMap[currency]) { // try to add a currency if we don't have one
      price = currencySymbolMap[currency] + price
    }

    if (price) {
      price = price.trim()
    }

    // ratings

    var ratingEl = document.querySelector('.star-img, .rating, [itemprop="ratingValue"], [property="ratingValue"]')

    if (!ratingEl) { // if we didn't find an element, try again with things that might be a rating element, but are less likely
      ratingEl = document.querySelector('[class^="rating"], [class^="review"]')
    }

    if (ratingEl) {
      rating = ratingEl.title || ratingEl.alt || ratingEl.content || ratingEl.getAttribute('content') || ratingEl.textContent
      rating = rating.replace('rating', '').replace('stars', '').replace('star', '').trim()

      // if the rating is just a number, round it first, because some websites (such as walmart.com) don't round it automatically
      if (/^[\d\.]+$/g.test(rating)) {
        try {
          rating = Math.round(parseFloat(rating) * 100) / 100
        } catch (e) {}
      }

      if (rating && /\d+$/g.test(rating)) { // if the rating ends in a number, we assume it means "stars", and append the prefix
        rating = rating + ' stars'
      }
    }

    if (rating && rating.length > 20) {
      // very long strings are unlikely to actually be ratings
      rating = undefined
    }

    // location

    var locationEl = document.querySelector('[itemprop="location"], [itemprop="address"]')

    if (!locationEl) {
      var locationEl = document.querySelector('.adr, .addr, .address')
    }

    if (locationEl) {
      location = locationEl.textContent.trim()
    }

    // remove US postcodes, since these usually aren't important and they take up space
    // TODO make this work for other countries
    if (location && /,?\d{5}$/g.test(location)) {
      location = location.replace(/,?\d{5}$/g, '')
    }

    if (location && location.length > 60) {
      location = undefined
    }

    // cooking time

    var cookingTimeEl = document.querySelector('[itemprop="totalTime"], [itemprop="cookTime"]')

    if (cookingTimeEl) {
      cookTime = cookingTimeEl.textContent
      cookTime = cookTime.replace(/\sm$/g, ' minutes').replace(/\sh$/g, ' hours')
      cookTime = cookTime.replace('1 hours', '1 hour')
    }

    if (cookTime && cookTime.length > 20) {
      cookTime = undefined
    }

    var text = extractPageText(document, window)

    // try to also extract text for same-origin iframes (such as the reader mode frame)

    var frames = document.querySelectorAll('iframe')

    for (var x = 0; x < frames.length; frames++) {
      try {
        text += '. ' + extractPageText(frames[x].contentDocument, frames[x].contentWindow)
      } catch (e) {}
    }

    // limit the amount of text that is collected

    text = text.substring(0, 300000)

    cb({
      extractedText: text,
      metadata: {
        price: price,
        rating: rating,
        location: location,
        cookTime: cookTime
      }
    })
  })
}

// send the data when the page loads

window.addEventListener('load', function (e) {
  setTimeout(function () {
    getPageData(function (data) {
      ipc.send('pageData', data)
    })
  }, 500)
})
