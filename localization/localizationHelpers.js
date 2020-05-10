/* provides helper functions for using localized strings */

/*
translations are compiled into here by running "npm run build" in this format

var languages = {
    en-US: {name: "English (United States), identifier: "en-US", translations: {...}}
}

*/

function getCurrentLanguage () {
  // TODO add a setting to change the language to something other than the default

  var language = 'en-US' // default

  if (typeof navigator !== 'undefined') { // renderer process
    language = navigator.language
  } else if (typeof app !== 'undefined') { // main process
    language = app.getLocale()
  } else {
    // nothing worked, fall back to default
  }

  return language
}

var userLanguage = null

function l (stringId) {
  if (!userLanguage) {
    userLanguage = getCurrentLanguage()
  }

  // get the translated string for the given ID

  // try to use the string for the user's language
  if (languages[userLanguage] && languages[userLanguage].translations[stringId] && languages[userLanguage].translations[stringId].unsafeHTML !== null) {
    return languages[userLanguage].translations[stringId]
  } else {
    // fallback to en-US
    return languages['en-US'].translations[stringId]
  }
}

/* for static HTML pages
insert a localized string into all elements with a [data-string] attribute
set the correct attributes for all elements with a [data-label] attribute
set the value attribute for all elements with a [data-value] attribute
 */

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-string]').forEach(function (el) {
    var str = l(el.getAttribute('data-string'))
    if (typeof str === 'string') {
      el.textContent = str
    } else if (str && str.unsafeHTML && el.hasAttribute('data-allowHTML')) {
      el.innerHTML = str.unsafeHTML
    }
  })
  document.querySelectorAll('[data-label]').forEach(function (el) {
    var str = l(el.getAttribute('data-label'))
    if (typeof str === 'string') {
      el.setAttribute('title', str)
      el.setAttribute('aria-label', str)
    } else {
      throw new Error('invalid data-label value: ' + str)
    }
  })
  document.querySelectorAll('[data-value]').forEach(function (el) {
    var str = l(el.getAttribute('data-value'))
    if (typeof str === 'string') {
      el.setAttribute('value', str)
    } else {
      throw new Error('invalid data-value value: ' + str)
    }
  })

}
if (typeof window !== 'undefined') {
  window.l = l
  window.userLanguage = userLanguage
  window.getCurrentLanguage = getCurrentLanguage
}
