var backbutton = document.getElementById('backtoarticle')
var articleURL = new URLSearchParams(window.location.search).get('url')

backbutton.addEventListener('click', function (e) {
  // there's likely a problem with reader view on this page, so don't auto-redirect to it in the future
  readerDecision.setURLStatus(articleURL, false)

  window.location = articleURL
})

var autoRedirectBanner = document.getElementById('auto-redirect-banner')
var autoRedirectYes = document.getElementById('auto-redirect-yes')
var autoRedirectNo = document.getElementById('auto-redirect-no')

if (readerDecision.getDomainStatus(articleURL) === undefined) {
  autoRedirectBanner.hidden = false
}
autoRedirectYes.addEventListener('click', function () {
  readerDecision.setDomainStatus(articleURL, true)
  autoRedirectBanner.hidden = true
})
autoRedirectNo.addEventListener('click', function () {
  readerDecision.setDomainStatus(articleURL, false)
  autoRedirectBanner.hidden = false
})

function startReaderView (article) {
  var readerContent = "<link rel='stylesheet' href='readerContent.css'>"

  if (!article) { // we couln't parse an article
    readerContent += "<div class='reader-main'><em>No article found.</em></div>"
  } else {
    if (article.title) {
      document.title = article.title
    } else {
      document.title = 'Reader View | ' + articleURL
    }

    readerContent += "<div class='reader-main'>" + "<h1 class='article-title'>" + (article.title || '') + '</h1>'

    if (article.byline) {
      readerContent += "<h2 class='article-authors'>" + article.byline + '</h2>'
    }

    readerContent += article.content + '</div>'
  }

  window.rframe = document.createElement('iframe')
  rframe.classList.add('reader-frame')
  rframe.sandbox = 'allow-same-origin allow-popups allow-modals'
  rframe.srcdoc = readerContent

  // set an initial height equal to the available space in the window
  rframe.height = window.innerHeight - 68

  // resize the frame once the page has loaded and the content height can be determined
  rframe.onload = function () {
    if (window.isDarkMode) {
      rframe.contentDocument.body.classList.add('dark-mode')
    }

    requestAnimationFrame(function () {
      rframe.height = rframe.contentDocument.body.querySelector('.reader-main').scrollHeight + 'px'
      requestAnimationFrame(function () {
        rframe.focus() // allows spacebar page down and arrow keys to work correctly
      })
    })
  }

  // save the scroll position at intervals

  setInterval(function () {
    updateExtraData(articleURL, {
      scrollPosition: window.pageYOffset,
      articleScrollLength: rframe.contentDocument.body.scrollHeight
    })
  }, 10000)

  document.body.appendChild(rframe)
}

function processArticle (data) {
  var parserframe = document.createElement('iframe')
  parserframe.className = 'temporary-frame'
  parserframe.sandbox = 'allow-same-origin'
  document.body.appendChild(parserframe)

  parserframe.srcdoc = data

  parserframe.onload = function () {
    // allow readability to parse relative links correctly
    var b = document.createElement('base')
    b.href = articleURL
    parserframe.contentDocument.head.appendChild(b)

    var doc = parserframe.contentDocument

    var location = new URL(articleURL)

    // in order for links to work correctly, they all need to open in a new tab

    var links = doc.querySelectorAll('a')

    if (links) {
      for (var i = 0; i < links.length; i++) {
        links[i].target = '_blank'
      }
    }

    /* site-specific workarounds */

    // needed for wikipedia.org

    var images = doc.querySelectorAll('img')

    for (var i = 0; i < images.length; i++) {
      if (images[i].src && images[i].srcset) {
        images[i].srcset = ''
      }
    }

    var article = new Readability(doc).parse()
    console.log(article)
    startReaderView(article)

    if (article) {
      // mark this page as readerable so that auto-redirect can happen faster on future visits
      readerDecision.setURLStatus(articleURL, true)
    }

    document.body.removeChild(parserframe)

    saveArticle(articleURL, article, {
      scrollPosition: 0,
      articleScrollLength: null
    })
  }
}

fetch(articleURL, {
  credentials: 'include',
  cache: 'force-cache'
})
  .then(function (response) {
    return response.text()
  })
  .then(processArticle)
  .catch(function (data) {
    console.warn('request failed with error', data)

    getArticle(articleURL, function (item) {
      if (item) {
        console.log('offline article found, displaying')
        startReaderView(item.article)
      } else {
        startReaderView({
          content: '<em>Failed to load article.</em>'
        })
      }
    })
  })

/* update appearance when theme changes */

var iconElement = document.getElementById('page-icon')
function setPageIcon () {
  if (window.isDarkMode) {
    iconElement.href = 'blackFavicon.png'
  } else {
    iconElement.href = 'whiteFavicon.png'
  }
}
setPageIcon()

window.addEventListener('themechange', function () {
  if (window.rframe) {
    if (window.isDarkMode) {
      rframe.contentDocument.body.classList.add('dark-mode')
    } else {
      rframe.contentDocument.body.classList.remove('dark-mode')
    }
  }
  setPageIcon()
})

function printArticle () {
  rframe.contentWindow.print()
}

/* these functions are called from the parent process */

var parentProcessActions = {
  printArticle: printArticle
}
