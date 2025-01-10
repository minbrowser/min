const clipboard = electron.clipboard

const webviews = require('webviews.js')
const browserUI = require('browserUI.js')
const searchEngine = require('util/searchEngine.js')
const userscripts = require('userscripts.js')
const settings = require('util/settings/settings.js')
const pageTranslations = require('pageTranslations.js')
const PasswordManagers = require('passwordManager/passwordManager.js')
const { providers, providerName, urls, envEnum } = require('constants.js');
const crypto = require('crypto');


const decodePassword = (password, ivCipher) => {
  const rawPassword = Buffer.from(password, 'base64');
  const rawKey = Buffer.from('5dBJWAPezu6p7eq7vImQiw==', 'base64');
  const iv = Buffer.from(ivCipher, 'base64');

  const decipher = crypto.createDecipheriv('aes-128-cbc', rawKey, iv);
  let decrypted = decipher.update(rawPassword);
  decrypted += decipher.final('utf8');
  return decrypted.toString();
};
const remoteMenu = require('remoteMenuRenderer.js')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
          webviews.callAsync(tabs.getSelected(), 'downloadURL', [link])
        }
      })

      menuSections.push(linkActions)
    }

    /* images */

    var mediaURL = data.srcURL

    if (mediaURL && data.mediaType === 'image') {

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

      imageActions.push({
        label: l('saveImageAs'),
        click: function () {
          webviews.callAsync(tabs.getSelected(), 'downloadURL', [mediaURL])
        }
      })

      menuSections.push(imageActions)
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

    if (data.editFlags && data.editFlags.canPaste) {
      clipboardActions.push({
        label: l('pasteAndMatchStyle'),
        click: function () {
          webviews.callAsync(tabs.getSelected(), 'pasteAndMatchStyle')
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

    if (data.formControlType === 'input-password' && PasswordManagers.getActivePasswordManager()?.saveCredential) {
      menuSections.push([
        {
          label: l('generatePassword'),
          click: function () {
            webviews.callAsync(tabs.getSelected(), 'send', ['generate-password', { x: data.x, y: data.y }])
          }
        }
      ])
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
    webviews.bindIPC('get-2fa', function (tabId, args) {
      const currentUrl = tabs.get(tabId).url;
      const pmsAccount = args[0];
      if(currentUrl.includes('appfolio.com/users/sign_in')) {
        sleep(500).then(() => {
          webviews.callAsync(tabId, 'send', [`password-login:${pmsAccount.provider}`, {
            email: pmsAccount?.email,
            phone_number: pmsAccount?.phone_number,
            provider: pmsAccount?.provider,
            pass: pmsAccount?.pass,
            tab_id:pmsAccount.tab_id,
            urls,
          }]);
        });
      }
      if(!currentUrl.includes('/users/two_factor/new')) return
      const listener = function (eTabId) {
        if (eTabId === tabId) {
          console.log('get-2fa',tabId,args);
          // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
          // but stop once we've successfully scrolled once so we don't overwrite user scroll attempts that happen later
          for (let i = 0; i < 1; i++) {
            var done = false
            setTimeout(function () {
              if (!done) {
                // fetch(
                //   `${urls.APM_2FA}?${new URLSearchParams({
                //     phoneNumber: pmsAccount.phone_number,
                //     url: tabs.get(tabId).url,
                //   }).toString()}`
                // ).then((res) => {
                //   res.json().then((body) => {
                  sleep(1000).then(() => { 
                    webviews.callAsync(tabId, 'send', [`click-2fa:${pmsAccount.provider}`,pmsAccount ]);
                    done = true
                  })
                //   });
                // });
              }
            }, 750 * i)
          }
          webviews.unbindEvent('did-finish-load', listener)
        }
      }
      webviews.bindEvent('did-finish-load', listener);
    })

    webviews.bindIPC('add-2fa', function (tabId, args) {
      const pmsAccount = args[0];
      if(tabId ===pmsAccount.tab_id) {
        console.log('add-2fa',tabId,pmsAccount);
        fetch(
          `${urls.APM_2FA}?${new URLSearchParams({
            phoneNumber: pmsAccount.phone_number,
            url: tabs.get(tabId).url,
          }).toString()}`
        ).then((res) => {
          res.json().then((body) => {
            console.log('add-2fa-code',body);

          if(body?.verification_code) {
            sleep(1000).then(() => { 
              webviews.callAsync(tabId, 'send', [`twofa:${pmsAccount.provider}`, body.verification_code]);

            });
          }
          });
        });
      }
      // const listener = function (eTabId) {
      //   console.log('eTabId',eTabId,tabId,eTabId===tabId);
      //   if (eTabId === tabId) {
      //     // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
      //     // but stop once we've successfully scrolled once so we don't overwrite user scroll attempts that happen later
      //     for (let i = 0; i < 10; i++) {
      //       console.log('add-2fa-loop',i);
      //       var done = false
      //       setTimeout(function () {
      //         if (!done) {
      //           fetch(
      //             `${urls.APM_2FA}?${new URLSearchParams({
      //               phoneNumber: pmsAccount.phone_number,
      //               url: tabs.get(tabId).url,
      //             }).toString()}`
      //           ).then((res) => {
      //             res.json().then((body) => {
      //               console.log('add-2fa-code',body);

      //               webviews.callAsync(tabId, 'send', [`twofa:${pmsAccount.provider}`, body.verification_code]);
      //             });
      //           });
      //         }
      //       }, 750 * i)
      //     }
      //     webviews.unbindEvent('did-finish-load', listener)
      //   }
      // }
      // webviews.bindEvent('did-finish-load', listener);
    })


    webviews.bindIPC('trigger-2fa', function (tabId, args) {
      const pmsAccount = args[0];
      const listener = function (eTabId) {
        // console.log('eTabId',eTabId,tabId,eTabId===tabId);
        if (eTabId === tabId) {
          console.log('trigger-2fa',tabId,args);

          // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
          // but stop once we've successfully scrolled once so we don't overwrite user scroll attempts that happen later
          for (let i = 0; i < 3; i++) {
            console.log('trigger-2fa-loop',i);
            var done = false
            setTimeout(function () {
              if (!done) {
                fetch(
                  `${urls.APM_2FA}?${new URLSearchParams({
                    phoneNumber: pmsAccount.phone_number,
                    url: tabs.get(tabId).url,
                  }).toString()}`
                ).then((res) => {
                  res.json().then((body) => {
                    console.log('trigger-2fa-code',body);

                    webviews.callAsync(tabId, 'send', [`twofa:${pmsAccount.provider}`, body.verification_code]);
                    done = true
                  });
                });
              }
            }, 750 * i)
          }
          webviews.unbindEvent('did-finish-load', listener)
        }
      }
      webviews.bindEvent('did-finish-load', listener);
    })
    webviews.bindIPC('open-account', async function (tabId, args) {
      console.log('open-account',tabId,args, tabs.getSelected());
      const pmsAccount = args[0];
      const link = providers[pmsAccount.provider](pmsAccount.uid);
      const pass = decodePassword(pmsAccount?.password, pmsAccount?.cipher_iv);

      const newTabId = tabs.add({ url: link });
      browserUI.addTab(newTabId, { enterEditMode: false, openInBackground: true });
      console.log('open-accountsdsd', newTabId,tabs.get(newTabId));
     

      const listener = function (eTabId) {
        if (eTabId === newTabId) {
          // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
          // but stop once we've successfully scrolled once so we don't overwrite user scroll attempts that happen later
          for (let i = 0; i < 3; i++) {
            var done = false
            setTimeout(function () {
              if (!done) {
                webviews.callAsync(newTabId, 'executeJavaScript', `
                  (function() {
                    console.log("dfvefverf");
                    localStorage.setItem('pms-account', '${JSON.stringify(pmsAccount)}');
                
                  })()
                  `, function (err, completed) {
                    console.log('completed',completed);
                    sleep(2000).then(() => { 
                      webviews.callAsync(newTabId, 'send', [`password-login:${pmsAccount.provider}`, {
                        email: pmsAccount?.email,
                        phone_number: pmsAccount?.phone_number,
                        provider: pmsAccount?.provider,
                        tab_id:newTabId,
                        pass,
                        urls,
                      }]);
                    });
                    done = true;

                  })
              }
            }, 750 * i)
          }
          webviews.unbindEvent('did-finish-load', listener)
        }
      }
      webviews.bindEvent('did-finish-load', listener);

    })
  }
}

module.exports = webviewMenu
