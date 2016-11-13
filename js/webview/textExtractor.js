/* send bookmarks data.  */

function extractPageText (doc, win) {
  var maybeNodes = [].slice.call(doc.body.childNodes)
  var textNodes = []

  var ignore = 'link, style, script, noscript, .visually-hidden, .visuallyhidden, [role=presentation], [hidden], [style*="display:none"], .ad, .dialog, .modal'

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

  text = text.replace(/[\n\t]/g, '') // remove useless newlines/tabs that increase filesize

  text = text.replace(/\s{2,}/g, ' ') // collapse multiple spaces into one

  return text
}

function getPageData () {
  /* also parse special metadata: price, rating, location, cooking time */

  var price, rating, location, cookTime

  // pricing

  var priceEl = document.querySelector('[itemprop=price], .price, .offer-price, #priceblock_ourprice, .discounted-price')
  var currencyEl = document.querySelector('[itemprop=priceCurrency], [property=priceCurrency]')

  if (priceEl) {
    price = priceEl.textContent
  }

  if (!/\d/g.test(price)) { // if the price doesn't contain a number, it probably isn't accurate
    price = undefined
  }

  if (price && price.indexOf('$') === -1 && currencyEl && navigator.language === 'en-US') { // try to add a currency if we don't have one. We should probably check for other currencies, too.
    price = (currencyEl.content || currencyEl.textContent).replace('USD', '$') + price
  }

  // ratings

  var ratingEl = document.querySelector('.star-img, .rating, [itemprop="ratingValue"], [property="ratingValue"]')

  if (!ratingEl) { // if we didn't find an element, try again with things that might be a rating element, but are less likely
    ratingEl = document.querySelector('[class^="rating"], [class^="review"]')
  }

  if (ratingEl) {
    rating = ratingEl.title || ratingEl.alt || ratingEl.content || ratingEl.textContent
    rating = rating.replace('rating', '').replace('stars', '').replace('star', '').trim()
    if (rating && /\d+$/g.test(rating)) { // if the rating ends in a number, we assume it means "stars", and append the prefix
      rating = rating + ' stars'
    }
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

  // cooking time

  var cookingTimeEl = document.querySelector('[itemprop="totalTime"], [itemprop="cookTime"]')

  if (cookingTimeEl) {
    cookTime = cookingTimeEl.textContent
    cookTime = cookTime.replace(/\sm$/g, ' minutes').replace(/\sh$/g, ' hours')
    cookTime = cookTime.replace('1 hours', '1 hour')
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

  return {
    extractedText: text,
    metadata: {
      price: price,
      rating: rating,
      location: location,
      cookTime: cookTime
    }
  }
}

// send the data when the page loads
// TODO find out why using window.onload breaks the preload script

function checkDoc () {
  if (document.readyState === 'complete') {
    ipc.sendToHost('pageData', getPageData())
  } else {
    setTimeout(checkDoc, 500)
  }
}

setTimeout(checkDoc, 500)
