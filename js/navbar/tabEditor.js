var searchbar = require('searchbar/searchbar.js')
var webviews = require('webviews.js')
var modalMode = require('modalMode.js')
var urlParser = require('util/urlParser.js')
var bookmarkStar = require('navbar/bookmarkStar.js')

const tabEditor = {
  container: document.getElementById('tab-editor'),
  input: document.getElementById('tab-editor-input'),
  star: null,
  show: function (tabId, editingValue, showSearchbar) {
    /* Edit mode is not available in modal mode. */
    if (modalMode.enabled()) {
      return
    }

    tabEditor.container.hidden = false

    bookmarkStar.update(tabId, tabEditor.star)

    webviews.requestPlaceholder('editMode')

    document.body.classList.add('is-edit-mode')

    var currentURL = urlParser.getSourceURL(tabs.get(tabId).url)
    if (currentURL === 'min://newtab') {
      currentURL = ''
    }

    tabEditor.input.value = editingValue || currentURL
    tabEditor.input.focus()
    if (!editingValue) {
      tabEditor.input.select()
    }

    searchbar.show(tabEditor.input)

    if (showSearchbar !== false) {
      if (editingValue) {
        searchbar.showResults(editingValue, null)
      } else {
        searchbar.showResults('', null)
      }
    }

    /* animation */
    if (tabs.count() > 1) {
      requestAnimationFrame(function () {

        var item = document.querySelector(`.tab-item[data-tab="${tabId}"]`)
        var originCoordinates = item.getBoundingClientRect()

        var finalCoordinates = document.querySelector('#tabs').getBoundingClientRect()

        var translateX = Math.min(Math.round(originCoordinates.x - finalCoordinates.x) * 0.45, window.innerWidth)

        tabEditor.container.style.opacity = 0
        tabEditor.container.style.transform = `translateX(${translateX}px)`
        requestAnimationFrame(function () {
          tabEditor.container.style.transition = '0.135s all'
          tabEditor.container.style.opacity = 1
          tabEditor.container.style.transform = ''
        })
      })
    }
  },
  hide: function () {
    tabEditor.container.hidden = true
    tabEditor.container.removeAttribute('style')

    tabEditor.input.blur()
    searchbar.hide()

    document.body.classList.remove('is-edit-mode')

    webviews.hidePlaceholder('editMode')
  },
  initialize: function () {
    tabEditor.input.setAttribute('placeholder', l('searchbarPlaceholder'))

    tabEditor.star = bookmarkStar.create()
    tabEditor.container.appendChild(tabEditor.star)

    tabEditor.input.addEventListener('keydown', function (e) {
      if (e.keyCode === 9 || e.keyCode === 40) { // if the tab or arrow down key was pressed
        searchbar.focusItem()
        e.preventDefault()
      }
    })

    // keypress doesn't fire on delete key - use keyup instead
    tabEditor.input.addEventListener('keyup', function (e) {
      if (e.keyCode === 8) {
        searchbar.showResults(this.value, e)
      }
    })

    tabEditor.input.addEventListener('keypress', function (e) {
      if (e.keyCode === 13) { // return key pressed; update the url
        if (this.getAttribute('data-autocomplete') && this.getAttribute('data-autocomplete').toLowerCase() === this.value.toLowerCase()) {
          // special case: if the typed input is capitalized differently from the actual URL that was autocompleted (but is otherwise the same), then we want to open the actual URL instead of what was typed.
          // see https://github.com/minbrowser/min/issues/314#issuecomment-276678613
          searchbar.openURL(this.getAttribute('data-autocomplete'), e)
        } else {
          searchbar.openURL(this.value, e)
        }
      } else if (e.keyCode === 9) {
        return
        // tab key, do nothing - in keydown listener
      } else if (e.keyCode === 16) {
        return
        // shift key, do nothing
      } else if (e.keyCode === 8) {
        return
        // delete key is handled in keyUp
      } else { // show the searchbar
        searchbar.showResults(this.value, e)
      }

      // on keydown, if the autocomplete result doesn't change, we move the selection instead of regenerating it to avoid race conditions with typing. Adapted from https://github.com/patrickburke/jquery.inlineComplete

      var v = e.key
      var sel = this.value.substring(this.selectionStart, this.selectionEnd).indexOf(v)

      if (v && sel === 0) {
        this.selectionStart += 1
        e.preventDefault()
      }
    })

    document.getElementById('webviews').addEventListener('click', function () {
      tabEditor.hide()
    })
  }
}

tabEditor.initialize()

module.exports = tabEditor
