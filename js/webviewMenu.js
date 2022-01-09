const clipboard = electron.clipboard

const webviews = require('webviews.js')
const browserUI = require('browserUI.js')
const searchEngine = require('util/searchEngine.js')
const userscripts = require('userscripts.js')
const settings = require('util/settings/settings.js')
const pageTranslations = require('pageTranslations.js')

const remoteMenu = require('remoteMenuRenderer.js')

const webviewMenu = {
  menuData: null,
  showMenu: function (data, extraData) { // data comes from a context-menu event
    var currentTab = tabs.get(tabs.getSelected())

    var menuSections = []

    const openInBackground = !settings.get('openTabsInForeground')

    /* Picture in Picture */

    if (extraData.hasVideo) {
      menuSections.push([
        {
          label: l('pictureInPicture'),
          click: function () {
            webviews.callAsync(tabs.getSelected(), 'send', ['enterPictureInPicture', { x: data.x, y: data.y }])
          }
        }
      ])
    }

    /* Spellcheck */

    if (data.misspelledWord) {
      var suggestionEntries = data.dictionarySuggestions.slice(0, 3).map(function (suggestion) {
        return {
          label: suggestion,
          click: function () {
            webviews.callAsync(tabs.getSelected(), 'replaceMisspelling', suggestion)
          }
        }
      })

      // https://www.electronjs.org/docs/api/session#sesaddwordtospellcheckerdictionaryword
      // "This API will not work on non-persistent (in-memory) sessions"
      if (!currentTab.private) {
        suggestionEntries.push({
          label: l('addToDictionary'),
          click: function () {
            ipc.invoke('addWordToSpellCheckerDictionary', data.misspelledWord)
          }
        })
      }

      if (suggestionEntries.length > 0) {
        menuSections.push(suggestionEntries)
      }
    }

    /* links */

    var link = data.linkURL

    // show link items for embedded frames, but not the top-level page (which will also be listed as a frameURL)
    if (!link && data.frameURL && data.frameURL !== currentTab.url) {
      link = data.frameURL
    }

    if (link === 'about:srcdoc') {
      /* srcdoc is used in reader view, but it can't actually be opened anywhere outside of the reader page */
      link = null
    }

    var mediaURL = data.srcURL

    if (link) {
      var linkActions = [
        {
          label: (link.length > 60) ? link.substring(0, 60) + '...' : link,
          enabled: false
        }
      ]

      if (!currentTab.private) {
        linkActions.push({
          label: l('openInNewTab'),
          click: function () {
            browserUI.addTab(tabs.add({ url: link }), { enterEditMode: false, openInBackground: openInBackground })
          }
        })
      }

      linkActions.push({
        label: l('openInNewPrivateTab'),
        click: function () {
          browserUI.addTab(tabs.add({ url: link, private: true }), { enterEditMode: false, openInBackground: openInBackground })
        }
      })

      linkActions.push({
        label: l('saveLinkAs'),
        click: function () {
          ipc.invoke('downloadURL', link)
        }
      })

      menuSections.push(linkActions)
    } else if (mediaURL && data.mediaType === 'image') {
      /* images */
      /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */

      var imageActions = [
        {
          label: (mediaURL.length > 60) ? mediaURL.substring(0, 60) + '...' : mediaURL,
          enabled: false
        }
      ]

      imageActions.push({
        label: l('viewImage'),
        click: function () {
          webviews.update(tabs.getSelected(), mediaURL)
        }
      })

      if (!currentTab.private) {
        imageActions.push({
          label: l('openImageInNewTab'),
          click: function () {
            browserUI.addTab(tabs.add({ url: mediaURL }), { enterEditMode: false, openInBackground: openInBackground })
          }
        })
      }

      imageActions.push({
        label: l('openImageInNewPrivateTab'),
        click: function () {
          browserUI.addTab(tabs.add({ url: mediaURL, private: true }), { enterEditMode: false, openInBackground: openInBackground })
        }
      })

      menuSections.push(imageActions)

      menuSections.push([
        {
          label: l('saveImageAs'),
          click: function () {
            ipc.invoke('downloadURL', mediaURL)
          }
        }
      ])
    }

    /* selected text */

    var selection = data.selectionText

    if (selection) {
      var textActions = [
        {
          label: l('searchWith').replace('%s', searchEngine.getCurrent().name),
          click: function () {
            var newTab = tabs.add({
              url: searchEngine.getCurrent().searchURL.replace('%s', encodeURIComponent(selection)),
              private: currentTab.private
            })
            browserUI.addTab(newTab, {
              enterEditMode: false,
              openInBackground: false
            })
          }
        }
      ]
      menuSections.push(textActions)
    }

    var clipboardActions = []

    if (mediaURL && data.mediaType === 'image') {
      clipboardActions.push({
        label: l('copy'),
        click: function () {
          webviews.callAsync(tabs.getSelected(), 'copyImageAt', [data.x, data.y])
        }
      })
    } else if (selection) {
      clipboardActions.push({
        label: l('copy'),
        click: function () {
          webviews.callAsync(tabs.getSelected(), 'copy')
        }
      })
    }

    if (data.editFlags && data.editFlags.canPaste) {
      clipboardActions.push({
        label: l('paste'),
        click: function () {
          webviews.callAsync(tabs.getSelected(), 'paste')
        }
      })
    }

    if (link || (mediaURL && !mediaURL.startsWith('blob:'))) {
      if (link && link.startsWith('mailto:')) {
        var ematch = link.match(/(?<=mailto:)[^\?]+/)
        if (ematch) {
          clipboardActions.push({
            label: l('copyEmailAddress'),
            click: function () {
              clipboard.writeText(ematch[0])
            }
          })
        }
      } else {
        clipboardActions.push({
          label: l('copyLink'),
          click: function () {
            clipboard.writeText(link || mediaURL)
          }
        })
      }
    }

    if (clipboardActions.length !== 0) {
      menuSections.push(clipboardActions)
    }

    var navigationActions = [
      {
        label: l('goBack'),
        click: function () {
          try {
            webviews.goBackIgnoringRedirects(tabs.getSelected())
          } catch (e) { }
        }
      },
      {
        label: l('goForward'),
        click: function () {
          try {
            webviews.callAsync(tabs.getSelected(), 'goForward')
          } catch (e) { }
        }
      }
    ]

    menuSections.push(navigationActions)

    /* inspect element */
    menuSections.push([
      {
        label: l('inspectElement'),
        click: function () {
          webviews.callAsync(tabs.getSelected(), 'inspectElement', [data.x || 0, data.y || 0])
        }
      }
    ])

    /* Userscripts */

    var contextMenuScripts = userscripts.getMatchingScripts(tabs.get(tabs.getSelected()).url).filter(function (script) {
      if (script.options['run-at'] && script.options['run-at'].includes('context-menu')) {
        return true
      }
    })

    if (contextMenuScripts.length > 0) {
      var scriptActions = [
        {
          label: l('runUserscript'),
          enabled: false
        }
      ]
      contextMenuScripts.forEach(function (script) {
        scriptActions.push({
          label: script.name,
          click: function () {
            userscripts.runScript(tabs.getSelected(), script)
          }
        })
      })
      menuSections.push(scriptActions)
    }

    var translateMenu = {
      label: 'Translate Page (Beta)',
      submenu: []
    }

    const translateLangList = pageTranslations.getLanguageList()

    translateLangList[0].forEach(function (language) {
      translateMenu.submenu.push({
        label: language.name,
        click: function () {
          pageTranslations.translateInto(tabs.getSelected(), language.code)
        }
      })
    })

    if (translateLangList[1].length > 0) {
      translateMenu.submenu.push({
        type: 'separator'
      })
      translateLangList[1].forEach(function (language) {
        translateMenu.submenu.push({
          label: language.name,
          click: function () {
            pageTranslations.translateInto(tabs.getSelected(), language.code)
          }
        })
      })
    }

    translateMenu.submenu.push({
      type: 'separator'
    })

    translateMenu.submenu.push({
      label: 'Send Feedback',
      click: function () {
        browserUI.addTab(tabs.add({ url: 'https://github.com/minbrowser/min/issues/new?title=Translation%20feedback%20for%20' + encodeURIComponent(tabs.get(tabs.getSelected()).url) }), { enterEditMode: false, openInBackground: false })
      }
    })

    menuSections.push([translateMenu])

    // Electron's default menu position is sometimes wrong on Windows with a touchscreen
    // https://github.com/minbrowser/min/issues/903
    var offset = webviews.getViewBounds()
    remoteMenu.open(menuSections, data.x + offset.x, data.y + offset.y)
  },
  initialize: function () {
    webviews.bindEvent('context-menu', function (tabId, data) {
      webviewMenu.menuData = data
      webviews.callAsync(tabs.getSelected(), 'send', ['getContextMenuData', { x: data.x, y: data.y }])
    })
    webviews.bindIPC('contextMenuData', function (tabId, args) {
      webviewMenu.showMenu(webviewMenu.menuData, args[0])
      webviewMenu.menuData = null
    })
  }
}

module.exports = webviewMenu
