import { LatencyOptimisedTranslator, TranslatorBacking } from '../../node_modules/@browsermt/bergamot-translator/translator.js'

import { franc } from '../../ext/franc/franc-6.2.0.bundle.mjs'
import iso6393To1Mapping from './iso3To1Mapping.mjs'

const registryUrl = 'https://services.minbrowser.org/bergamot-models-v1/registry.json'
const modelBaseUrl = 'https://services.minbrowser.org/bergamot-models-v1'

class CustomBacking extends TranslatorBacking {
  // Based on https://github.com/browsermt/bergamot-translator/blob/9271618ebbdc5d21ac4dc4df9e72beb7ce644774/wasm/module/translator.js#L207
  async loadModelRegistery () {
    const response = await fetch(registryUrl, { credentials: 'omit' })
    const registry = await response.json()

    return Array.from(Object.entries(registry), ([key, files]) => {
      for (const file in files) {
        if (files[file].modelType !== 'prod') {
          return null
        }
        // The translation module expects absolute URLs but the registry entries are relative by default
        files[file].name = `${modelBaseUrl}/${key}/${files[file].name}`
      }
      return {
        from: key.substring(0, 2),
        to: key.substring(2, 4),
        files
      }
    }).filter(model => model !== null)
  }
}

let sessionEndTimeout = null

window.addEventListener('message', async function (e) {
  if (e.source === window && e.data === 'page-translation-session-create') {
    const options = {
      registryUrl: 'https://services.minbrowser.org/bergamot-models-v1/registry.json',
      cacheSize: 0, // This is a cache of translations, not models
      downloadTimeout: null // Disable timeout
    }

    const backing = new CustomBacking(options)

    await backing.registry.then(models => {
    //   console.log(models)
    //   console.log([...new Set(models.map(model => model.to))].map(entry => ({ code: entry })))
    })

    const translator = new LatencyOptimisedTranslator(options, backing)

    const port = e.ports[0]
    port.onmessage = async function (e) {
      clearTimeout(sessionEndTimeout)
      sessionEndTimeout = setTimeout(window.close, 30000)

      if (e.data.type === 'translation-request') {
        const responses = []
        const requestLang = iso6393To1Mapping[franc(e.data.query.join(' '))]

        for (const entry of e.data.query) {
          let entryLang = requestLang
          if (entry.length > 200) {
            entryLang = iso6393To1Mapping[franc(entry)]
          }
          try {
            const response = await translator.translate({
              from: entryLang,
              to: e.data.lang,
              text: entry,
              html: false,
              qualityScores: false
            })
            responses.push(response.target.text)
          } catch (e) {
            responses.push(entry)
          }
        }
        port.postMessage({
          type: 'translation-response',
          translatedText: responses
        })
      }
    }
  }
})
