const settings = require('util/settings/settings.js')
const bangsPlugin = require('searchbar/bangsPlugin.js')
const webviews = require('webviews.js')

function initialize () {
  settings.set('customBangs', [
    {
      phrase: 'hello',
      redirect: 'https://example.com',
      snippet: 'hi'
    }
  ])

  console.log('running')

  const data = settings.get('customBangs')

  console.log(data)
  data.forEach((bang) => {
    bangsPlugin.registerCustomBang({
      phrase: `!${bang.phrase}`,
      snippet: `${bang.snippet}`,
      fn: function () {
        webviews.update(tabs.getSelected(), bang.redirect)
      }
    })
  })
}

module.exports = { initialize }
