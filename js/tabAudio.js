var webviews = require('webviews.js')
var keybindings = require('keybindings.js')
var getView = remote.getGlobal('getView')


var tabAudio = {
    muteIcon: "carbon:volume-mute-filled",
    volumeIcon: "carbon:volume-up-filled",
    setWebViewMuted: function(tabId, muted) {
        webviews.callAsync(tabId, "setAudioMuted", muted)
        // const webView = getView(tabId)
        // if (webView) {
        //     webView.webContents.setAudioMuted(muted)
        // }
    },
    getButton: function(tabId) {
        var button = document.createElement('button')
        button.className = 'tab-icon tab-audio-button i'

        button.setAttribute('data-tab', tabId)
        button.setAttribute('role', 'button')

        button.addEventListener('click', function (e) {
            e.stopPropagation()
            tabAudio.toggleAudio(tabId)
         
        })

        tabAudio.updateButton(tabId, button)

        return button
    },
    updateButton: function(tabId, button) {
        var button = button || document.querySelector('.tab-audio-button[data-tab="{id}"]'.replace('{id}', tabId))
        var tab = tabs.get(tabId)

        var muteIcon = tabAudio.muteIcon
        var volumeIcon = tabAudio.volumeIcon

        if (tab.muted) {
            button.classList.remove(volumeIcon)
            button.classList.add(muteIcon)
        } else if (tab.hasAudio) {
            button.classList.add(volumeIcon)
            button.classList.remove(muteIcon)
        } else {
            button.classList.remove(volumeIcon)
            button.classList.remove(muteIcon)
        }
    },
    toggleAudio: function(tabId) {
        var tab = tabs.get(tabId)
        tabAudio.setWebViewMuted(tabId, !tab.muted)
        tabs.update(tabId, {muted: !tab.muted})
    },
    initialize: function() {
        keybindings.defineShortcut('toggleTabAudio', function() {
            tabAudio.toggleAudio(tabs.getSelected())
        })
        webviews.bindEvent('media-started-playing', function (tabId) {
            console.log('started playing', tabId)
            tabs.update(tabId, {hasAudio: true})
        })
        webviews.bindEvent('media-paused', function (tabId) {
            console.log('media paused', tabId)
            tabs.update(tabId, {hasAudio: false})
        })
    }
}

tabAudio.initialize()

module.exports = tabAudio
