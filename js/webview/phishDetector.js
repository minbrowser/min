var phishingDebugMessages = []

function debugPhishing (msg) {
  phishingDebugMessages.push(msg)
// uncomment for debug mode
// console.log(msg)
}

/* phishing detector. Implements methods from http://www.ml.cmu.edu/research/dap-papers/dap-guang-xiang.pdf and others, as well as some custom methods */

var doubleDomainRegex = /\.(com|net|org|edu|gov|mil|uk|ca|jp|fr|au|us|ru|ch|it|nl|de|es)((\..*(com|net|org|edu|gov|mil))|(\..+(uk|ca|jp|fr|au|us|ru|ch|it|nl|de|es)))/g

function checkPhishingStatus () {
  // if there isn't a password input or ßform, skip the phishing analysis, since this probably isn't a phish
  if (!document.querySelector('input[type=password], form')) {
    return false
  }

  var scanStart = performance.now()

  function isSensitive (form) { // checks if a form is asking for sensitive information
    if (form.querySelector('input[type=password]')) {
      debugPhishing('form with password input found')
      sensitiveFormFound = true

      return true
    }

    if (form.querySelectorAll('input[type=text], input[type=password]').length === 2) {
      debugPhishing('possibly sensitive form, checking but increasing minScore')

      minPhishingScore *= 1.5
      sensitiveFormFound = true
      return true
    }

    // empty forms can be misleading

    if (!form.querySelector('input')) {
      debugPhishing('empty form found, checking but not counting as sensitive')
      minPhishingScore += 0.35
      return true
    }

    // if the form contains a sensitive word
    var tx = form.textContent.toLowerCase()

    for (var i = 0; i < sensitiveFormWords.length; i++) {
      if (tx.indexOf(sensitiveFormWords[i]) !== -1) {
        debugPhishing('sensitive word found in form, checking')
        sensitiveFormFound = true
        minPhishingScore += 0.075
        return true
      }
    }

    return false
  }

  var tldRegex = /\.(com|net|org|edu|gov|mil)$/g

  function getRootDomain (hostname) {
    var newData = hostname
    tldRegex.lastIndex = 0
    var chunks = hostname.split('.')

    if (tldRegex.test(hostname)) {
      newData = chunks[chunks.length - 2] + '.' + chunks[chunks.length - 1]
    }

    if (newData.indexOf('www.') === 0) {
      newData = newData.replace('www.', '')
    }
    return newData
  }

  function isThirdParty (base, test) {
    return base !== test && !test.endsWith('.' + base)
  }

  // if we have a password input, set a lower threshold

  if (document.querySelector('input[type=password]')) {
    minPhishingScore = 0.65
  }

  var sensitiveWords = ['secure', 'account', 'webscr', 'login', 'ebayisapi', 'signing', 'banking', 'confirm']
  var sensitiveFormWords = ['password', 'creditcard', 'credit card', 'security code', 'expiration date', 'card type', 'social security', 'income tax', 'date of birth', 'joint return'] // word commonly found in forms that ask for personal information
  var whitelistedDomains = ['adobeid-na1.services.adobe.com', 'www.zdnet.com', 'www.discover.com'] // a whitelist of things we mistakenly think are bad. These should be fixed eventually, but for now a whitelist will work.

  // on the whitelist

  for (var i = 0; i < whitelistedDomains.length; i++) {
    if (whitelistedDomains[i] === window.location.hostname) {
      debugPhishing('domain is whitelisted, not checking')
      return
    }
  }

  var loc = window.location.toString()
  var bodyText = document.body.textContent
  var bodyHtml = document.body.innerHTML

  var minPhishingScore = 1.25
  var phishingScore = 0

  // used for url parsing

  var aTest = document.createElement('a')

  // checks if the url has multiple domain endings in it. Catches things like "example.com.com", "example.com/example2.com", "secure.example.com.phishingsite.com", etc.

  if (doubleDomainRegex.test(loc)) {
    debugPhishing('found misleading domain')
    phishingScore += 0.0075 * window.location.toString().length
  }

  // no https - either insecure, phishing, or both

  if (window.location.protocol !== 'https:' && window.location.protocol !== 'file:') {
    debugPhishing('no https')
    phishingScore += 0.15
    if (window.location.protocol === 'data:') {
      debugPhishing('data: protocol found')
      phishingScore += 0.25
    }
  }

  // penalize long hostnames, since these are often used for phishing

  if (window.location.host.length > 25) {
    debugPhishing('long hostname detected')
    phishingScore += window.location.host.length * 0.0075
  }

  // penalize extremely long locations, since these could also be used for phishing

  if (loc.split('?')[0].length > 75) {
    debugPhishing('long window location detected')
    phishingScore += Math.min(window.location.toString().length * 0.0001, 0.2)
  }

  if (loc.split('#')[0].split('/').length > 5) {
    debugPhishing('long path found')
    phishingScore += Math.max(Math.min(loc.split('/').length * 0.05, 0.75), 0.25)
  }

  // CANTINA - penalize locations with lots of dots

  if (window.location.hostname.replace('www.', '').split('.').length > 3 && window.location.hostname.length > 20) {
    debugPhishing('high number of . characters detected')
    phishingScore += Math.min(loc.split('?')[0].split('.').length * 0.03, 0.2)
  }

  // compromised websites used for phishing tend to host phishing pages within a directory to avoid detection. Real websites tend to have a url like example.com/login, though.

  if (window.location.pathname.length > 25) {
    debugPhishing('paths detected')
    phishingScore += Math.min(0.05 + (0.002 * window.location.pathname.length), 0.25)
  }

  if (isTrustedDomainEnding && window.location.pathname.length < 20 && window.location.hostname.replace('www.', '').length < 18) {
    debugPhishing('short root domain found, increasing minScore')
    minPhishingScore += 0.3 + 0.05 * (18 - window.location.hostname.length) - (0.01 * window.location.pathname.length)
  }

  var trustedTLDs = ['com', 'org', 'edu', 'mil', 'gov', 'io']

  var pageTLD = window.location.hostname.split('.').reverse()[0]

  var isTrustedDomainEnding = trustedTLDs.indexOf(pageTLD) !== -1

  if (window.location.hostname && !isTrustedDomainEnding) {
    phishingScore += 0.15
    debugPhishing('unusual domain ending found, increasing score')
  }

  sensitiveWords.forEach(function (word) {
    if (loc.toLowerCase().indexOf(word) !== -1) {
      debugPhishing('detected sensitive word found in location')
      phishingScore += 0.025
    }
  })

  // implements feature 8 from http://www.ml.cmu.edu/research/dap-papers/dap-guang-xiang.pdf

  var forms = document.querySelectorAll('form')
  var totalFormLength = 0
  var formWithoutActionFound = false
  var formWithSimplePathFound = false
  var sensitiveFormFound = false

  // loop through each form
  if (forms) {
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i]
      var formText = form.innerHTML.toLowerCase()

      // if the form isn't sensitive, don't scan it

      if (!isSensitive(form)) {
        continue
      }

      var fa = form.getAttribute('action')

      // if no action, form might be fake

      if (!fa || loc.split('?')[0].indexOf(fa.split('?')[0]) !== -1) { // we also check if the form just submits to the same page with a different query string
        debugPhishing('form without action detected')
        formWithoutActionFound = true
        continue
      }

      totalFormLength += form.innerHTML.length

      if ((form.getAttribute('onsubmit') && form.getAttribute('onsubmit') !== 'return false') || form.getAttribute('onkeydown') || form.getAttribute('onkeypress') || form.getAttribute('onkeyup')) {
        debugPhishing('js html inline attributes detected')
        phishingScore += 0.05
      }

      // if the form action is in the same directory as the current page, it is likely to be phishing

      var slashCt = fa.replace(window.location.toString(), '').replace(window.location.pathname, '').split('/').length - 1

      if (fa.indexOf('javascript:') !== 0 && slashCt < 2) {
        debugPhishing('form with simple path for action detected')
        formWithSimplePathFound = true
      } else if (slashCt < 3) {
        debugPhishing('non-absolute form path detected')
        phishingScore += 0.1
      }

      // many toolkits seem to use php files, but most legitimate websites don't

      if (fa.indexOf('.php') !== -1) {
        debugPhishing('php file action found')
        phishingScore += 0.075
      }

      aTest.href = fa

      // if the form is submitted to a different domain, it is suspicious

      if (fa.indexOf('javascript:') !== 0 && isThirdParty(getRootDomain(window.location.hostname), getRootDomain(aTest.hostname))) {
        debugPhishing('submitting form to xdomain')
        phishingScore += 0.7
      }

      if (aTest.protocol !== 'https:') {
        debugPhishing('submitting form without https')
        phishingScore += 0.15
      }
    }

    if (formWithoutActionFound === true) {
      phishingScore += 0.3
      phishingScore += Math.min(0.2, totalFormLength * 0.0001)
    }

    if (formWithSimplePathFound === true) {
      phishingScore += 0.75
    }
  }
  if (!sensitiveFormFound && !document.querySelector('input[type=password]')) {
    debugPhishing('no sensitive forms found, increasing minScore')

    minPhishingScore += 0.5
  }

  var links = document.querySelectorAll('a, area[href]') // area tag is for image maps

  var linkDomains = {}
  var linkSources = {}

  var emptyLinksFound = 0
  var javascriptLinksFound = 0

  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href')

    // if href is blank or meaningless, page is more likely to be phishing (http://www.ml.cmu.edu/research/dap-papers/dap-guang-xiang.pdf item 9)

    if (!href || href === '#' && !links[i].onclick) { // ignore links that have a javascript handler, since these are expected to have an empty href
      emptyLinksFound++
      continue
    }

    // phishing sites use javascript: url's more often than legitimate sites, check for that

    if (href.indexOf('javascript:') === 0) {
      javascriptLinksFound++
    }

    aTest.href = links[i].href

    linkDomains[aTest.host] = linkDomains[aTest.host] + 1 || 1
    linkSources[href] = linkSources[href] + 1 || 1
  }

  // if there are several external links that point to the same domain, increase likelyhood of phishing

  var sameDomainLinks = 0
  var totalLinks = 0

  var rd = getRootDomain(window.location.host)

  for (var key in linkDomains) {
    totalLinks += linkDomains[key]
    if (getRootDomain(key) === rd) {
      sameDomainLinks += linkDomains[key]
      continue
    }
    if (linkDomains[key] > 4 && key && linkDomains[key] / totalLinks > 0.25) {
      debugPhishing('found ' + linkDomains[key] + ' links that point to domain ' + key)
      phishingScore += Math.min(0.1 * linkDomains[key], 0.25)
      break // we don't want to increase the phishing score more than once
    }
  }

  // if all or most of the links on the page are to external domains, likely to be phishing

  if (totalLinks > 2 && sameDomainLinks === 0 || (totalLinks > 5 && sameDomainLinks / totalLinks < 0.15)) {
    debugPhishing('links go to external domain')
    phishingScore += Math.min(0.1 + (totalLinks - sameDomainLinks) * 0.1, 0.5)
  }

  // if there are a bunch of empty links, increase score
  if (emptyLinksFound > 9 || (totalLinks > 2 && emptyLinksFound / totalLinks > 0.5)) {
    debugPhishing('counted ' + emptyLinksFound + ' empty links')
    phishingScore += Math.min(emptyLinksFound * 0.02, 0.2)
  }

  // if there are a lot of js links
  if (javascriptLinksFound > 3) {
    debugPhishing('counted ' + javascriptLinksFound + ' javascript links')
    phishingScore += 0.1
  }

  // if most of the page isn't forms, set a higher threshold

  var totalDocLength = bodyHtml.length

  if (totalFormLength > 50 && totalFormLength < 1000 && totalFormLength / totalDocLength < 0.075) {
    debugPhishing('forms are very minor part of page, increasing minScore')
    minPhishingScore += Math.min(1.15 - totalFormLength / totalDocLength, 1.2)
  } else if (totalFormLength > 50 && totalFormLength < 3500 && totalFormLength / totalDocLength < 0.14) {
    debugPhishing('forms are minor part of page, increasing minScore (small)')
    debugPhishing(totalFormLength)
    debugPhishing(totalDocLength)
    minPhishingScore += 0.25
  }

  // checks if most, but not all of the scripts on a page come from an external domain, possibly indicating an injected phishing script
  var scripts = document.querySelectorAll('script')

  var scriptSources = {}
  var totalScripts = 0
  if (scripts) {
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src) {
        aTest.href = scripts[i].src
        var scriptHost = aTest.hostname
        scriptSources[scriptHost] = scriptSources[scriptHost] + 1 || 1
        totalScripts++
      }
    }
  }

  var previous = 0

  for (var source in scriptSources) {
    if (scriptSources[source] > 2 && scriptSources[source] / totalScripts > 0.75 && scriptSources[source] < 0.95) {
      phishingScore += 0.1
      debugPhishing('external scripts found, increasing score')
    }
    previous = scriptSources[source]
  }

  // if we have lots of forms, we need a higher threshold, since phishingScore tends to increase with more forms

  if (forms.length > 3) {
    debugPhishing('many forms found, increasing minScore')
    minPhishingScore += Math.min(0.05 * forms.length, 0.2)
  }

  // tries to detect pages that use images to copy a ui

  if (document.body.innerHTML.length < 4500) {
    debugPhishing('small amount of body text, multiplying score')
    phishingScore *= 1.4
  }

  var icon = document.querySelector('link[rel="shortcut icon"]')

  if (icon && icon.href) {
    aTest.href = icon.href

    if (getRootDomain(aTest.hostname) !== rd) {
      debugPhishing('icon from external domain found')
      phishingScore += 0.1
    }
  }

  var paragraphs = document.querySelectorAll('p')
  if (paragraphs.length > 50) {
    debugPhishing('many paragraphs found, increasing minScore')
    minPhishingScore += 0.1 + Math.min(0.025 * paragraphs.length, 0.25)
  }

  // finally, if the phishing score is above a threshold, alert the parent process so we can redirect to a warning page

  debugPhishing('min ' + minPhishingScore)

  debugPhishing('status ' + phishingScore)

  if (phishingScore > minPhishingScore) {
    ipc.sendToHost('phishingDetected', phishingDebugMessages)
  }

  var scanEnd = performance.now()

  debugPhishing('phishing scan took ' + (scanEnd - scanStart) + ' milliseconds')

  return true
}

var didCheckStatus = false

window.addEventListener('load', function () {
  didCheckStatus = true
  setTimeout(checkPhishingStatus, 1000)
})

document.addEventListener('DOMContentLoaded', checkPhishingStatus)

// if the load event never fires, we still want to check

setTimeout(function () {
  if (!didCheckStatus) {
    checkPhishingStatus()
  }
}, 2500)
