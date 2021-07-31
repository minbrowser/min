const webviews = require('webviews.js')

const pageTranslations = {
  apiURL: 'https://translate-api.minbrowser.org/translate',
  languages: [
    {
      name: 'English',
      code: 'en'
    },
    {
      name: 'Arabic',
      code: 'ar'
    },
    {
      name: 'Chinese',
      code: 'zh'
    },
    {
      name: 'French',
      code: 'fr'
    },
    {
      name: 'German',
      code: 'de'
    },
    {
      name: 'Hindi',
      code: 'hi'
    },
    {
      name: 'Irish',
      code: 'ga'
    },
    {
      name: 'Italian',
      code: 'it'
    },
    {
      name: 'Japanese',
      code: 'ja'
    },
    {
      name: 'Korean',
      code: 'ko'
    },
    {
      name: 'Portuguese',
      code: 'pt'
    },
    {
      name: 'Russian',
      code: 'ru'
    },
    {
      name: 'Spanish',
      code: 'es'
    }
  ],
  getLanguageList: function () {
    const userPrefs = navigator.languages.map(lang => lang.split('-')[0])
    const topLangs = pageTranslations.languages.filter(lang => userPrefs.includes(lang.code))

    // Translations to/from English are the highest quality in Libretranslate, so always show that near the top
    if (!topLangs.some(lang => lang.code === 'en')) {
      topLangs.push(pageTranslations.languages.find(lang => lang.code === 'en'))
    }
    const otherLangs = pageTranslations.languages.filter(lang => !userPrefs.includes(lang.code) && lang.code !== 'en')
    return [topLangs, otherLangs]
  },
  translateInto (tabId, language) {
    webviews.callAsync(tabId, 'send', ['translate-page', language])
  },
  makeTranslationRequest: async function (tab, data) {
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify({
        q: data[0].query,
        source: 'auto',
        target: data[0].lang
      }),
      headers: { 'Content-Type': 'application/json' }
    }

    fetch(pageTranslations.apiURL, requestOptions)
      .then(res => res.json())
      .then(function (result) {
        console.log(result)
        webviews.callAsync(tab, 'send', ['translation-response-' + data[0].requestId, {
          response: result
        }])
      })
      .catch(function (e) {
        // retry once
        setTimeout(function () {
          console.warn('retrying translation request')
          fetch(pageTranslations.apiURL, requestOptions)
            .then(res => res.json())
            .then(function (result) {
              console.log('after retry', result)
              webviews.callAsync(tab, 'send', ['translation-response-' + data[0].requestId, {
                response: result
              }])
            })
        }, 5000)
      })
  },
  initialize: function () {
    webviews.bindIPC('translation-request', this.makeTranslationRequest)
  }
}

module.exports = pageTranslations
