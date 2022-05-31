const UPDATE_URL = 'https://minbrowser.github.io/min/updates/latestVersion.json'

var settings = require('util/settings/settings.js')

var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var compareVersions = require('util/compareVersions.js')

function getUpdateRandomNum () {
  /* the update JSON might indicate that the update is only available to a % of clients, in order to avoid notifying everyone to update to a new version until there's time to report bugs.
      Create a random number that is saved locally, and compare this to the indicated % to determine if the update notification should be shown. */

  if (!localStorage.getItem('updateRandomNumber')) {
    localStorage.setItem('updateRandomNumber', Math.random())
  }
  return parseFloat(localStorage.getItem('updateRandomNumber'))
}

function getAvailableUpdates () {
  if (settings.get('updateNotificationsEnabled') !== false) {
    console.info('checking for updates')
    fetch(UPDATE_URL, {
      cache: 'no-cache'
    })
      .then(res => res.json())
      .then(function (response) {
        console.info('got response from update check', response)
        if (response.version &&
            compareVersions(window.globalArgs['app-version'], response.version) > 0 &&
            (!response.availabilityPercent || getUpdateRandomNum() < response.availabilityPercent)) {
          console.info('an update is available')
          localStorage.setItem('availableUpdate', JSON.stringify(response))
        } else {
          console.info('update is not available')
          /* this can happen if either the update is no longer being offered, or the update has already been installed */
          localStorage.removeItem('availableUpdate')
        }
      })
      .catch(function (e) {
        console.info('failed to get update info', e)
      })
  } else {
    console.info('update checking is disabled')
  }
}

function showUpdateNotification (text, input, event) {
  function displayUpdateNotification () {
    searchbarPlugins.reset('updateNotifications')
    searchbarPlugins.addResult('updateNotifications', {
      title: l('updateNotificationTitle'),
      descriptionBlock: update.releaseHeadline || 'View release notes',
      url: update.releaseNotes,
      icon: 'carbon:renew'
    }, { allowDuplicates: true })
  }
  // is there an update?
  var update = JSON.parse(localStorage.getItem('availableUpdate'))
  if (update) {
    // was the update already installed?
    if (compareVersions(window.globalArgs['app-version'], update.version) <= 0) {
      return
    }
    var updateAge = Date.now() - update.releaseTime
    /* initially, only show an update notification when no tabs are open, in order to minimize disruption */
    if (updateAge < (3 * 7 * 24 * 60 * 60 * 1000)) {
      if (tabs.isEmpty()) {
        displayUpdateNotification()
      }
    } else {
      /* after 3 weeks, start showing a notification on all new tabs */
      if (!tabs.get(tabs.getSelected()).url) {
        displayUpdateNotification()
      }
    }
  }
}

setTimeout(getAvailableUpdates, 30000)
setInterval(getAvailableUpdates, 24 * 60 * 60 * 1000)

function initialize () {
  searchbarPlugins.register('updateNotifications', {
    index: 11,
    trigger: function (text) {
      return !text && performance.now() > 5000
    },
    showResults: showUpdateNotification
  })
}

module.exports = { initialize }
