const webviews = require('webviews.js')
const statistics = require('js/statistics.js')
const settings = require('util/settings/settings.js')

const pageTranslations = {
  apiURL: 'https://translate-api.minbrowser.org/translate',
  translatePrivacyInfo: 'When you translate a page, the page contents are sent to Min\'s servers. We don\'t save your translations or use them to identify you.',
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
      name: 'Dutch',
      code: 'nl'
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
      name: 'Indonesian',
      code: 'id'
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
      name: 'Polish',
      code: 'pl'
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
    },
    {
      name: 'Turkish',
      code: 'tr'
    },
    {
      name: 'Ukranian',
      code: 'uk'
    },
    {
      name: 'Vietnamese',
      code: 'vi'
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
    statistics.incrementValue('translatePage.' + language)

    if (!settings.get('translatePrivacyPrompt')) {
      const accepted = confirm(pageTranslations.translatePrivacyInfo)
      if (accepted) {
        settings.set('translatePrivacyPrompt', true)
      } else {
        return
      }
    }
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
