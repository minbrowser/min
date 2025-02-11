const webviews = require('webviews.js')
const statistics = require('js/statistics.js')

const pageTranslations = {
  languages: [
    {
      code: 'en'
    },
    {
      code: 'bg'
    },
    {
      code: 'ca'
    },
    {
      code: 'cs'
    },
    {
      code: 'da'
    },
    {
      code: 'de'
    },
    {
      code: 'el'
    },
    {
      code: 'es'
    },
    {
      code: 'et'
    },
    {
      code: 'fi'
    },
    {
      code: 'fr'
    },
    {
      code: 'hr'
    },
    {
      code: 'id'
    },
    {
      code: 'it'
    },
    {
      code: 'nl'
    },
    {
      code: 'pl'
    },
    {
      code: 'pt'
    },
    {
      code: 'ro'
    },
    {
      code: 'sl'
    },
    {
      code: 'sv'
    },
    {
      code: 'tr'
    }
  ],
  getLanguageList: function () {
    const formatter = new Intl.DisplayNames([navigator.language], { type: 'language' })
    const allLangs = pageTranslations.languages.map(lang => ({
      name: formatter.of(lang.code),
      code: lang.code
    }))

    const userPrefs = navigator.languages.map(lang => lang.split('-')[0])
    const topLangs = allLangs.filter(lang => userPrefs.includes(lang.code))

    // English is the base/pivot language in Bergamot, so always show that near the top
    if (!topLangs.some(lang => lang.code === 'en')) {
      topLangs.push(allLangs.find(lang => lang.code === 'en'))
    }
    const otherLangs = allLangs.filter(lang => !userPrefs.includes(lang.code) && lang.code !== 'en')
    return [topLangs, otherLangs]
  },
  translateInto (tabId, language) {
    statistics.incrementValue('translatePage.' + language)

    webviews.callAsync(tabId, 'send', ['translate-page', language])
  }
}

module.exports = pageTranslations
