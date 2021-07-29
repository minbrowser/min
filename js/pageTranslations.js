const webviews = require('webviews.js')

const pageTranslations = {
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
  translateInto (tabId, language) {
    webviews.callAsync(tabId, 'send', ['translate-page', language])
  },
  makeTranslationRequest: async function (tab, data) {
    console.log(data)
    const res = await fetch('http://143.198.178.22:5000/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: data[0].query,
        source: 'auto',
        target: data[0].lang
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const result = await res.json()

    console.log(result)

    webviews.callAsync(tab, 'send', ['translation-response', {
      response: result
    }])
  },
  initialize: function () {
    webviews.bindIPC('translation-request', this.makeTranslationRequest)
  }
}

module.exports = pageTranslations
