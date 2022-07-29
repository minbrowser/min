var places = require('places/places.js')
var autocomplete = require('util/autocomplete.js')
const remoteMenu = require('remoteMenuRenderer.js')
var { ipcRenderer } = require('electron')

const bookmarkEditor = {
  currentInstance: null,
  getTagElement: function (tag, selected, onClick, options = {}) {
    var el = document.createElement('button')
    el.className = 'tag'
    el.textContent = tag
    if (selected) {
      el.classList.add('selected')
      el.setAttribute('aria-pressed', true)
    } else {
      el.classList.add('suggested')
      el.setAttribute('aria-pressed', false)
    }
    el.addEventListener('click', function () {
      onClick()
      if (el.classList.contains('selected') && options.autoRemove !== false) {
        el.remove()
      } else {
        el.classList.remove('suggested')
        el.classList.add('selected')
      }
    })
    if (options.onModify) {
      el.addEventListener('contextmenu', function () {
        remoteMenu.open([
          [
            {
              label: l('bookmarksRenameTag'),
              click: function () {
                const res = ipcRenderer.sendSync('prompt', {
                  text: '',
                  values: [{ placeholder: l('bookmarksRenameTag'), id: 'name', type: 'text' }],
                  ok: l('dialogConfirmButton'),
                  cancel: l('dialogSkipButton'),
                  width: 500,
                  height: 140
                })

                if (!res || !res.name) {
                  return
                }

                const newName = res.name

                places.getAllItems(function (items) {
                  items.forEach(function (item) {
                    if (item.tags.includes(tag)) {
                      item.tags = item.tags.filter(t => t !== tag)
                      item.tags.push(newName)
                      places.updateItem(item.url, { tags: item.tags })
                    }
                  })
                  setTimeout(function () {
                    options.onModify()
                  }, 50)
                })
              }
            },
            {
              label: l('bookmarksDeleteTag'),
              click: function () {
                places.getAllItems(function (items) {
                  items.forEach(function (item) {
                    if (item.tags.includes(tag)) {
                      item.tags = item.tags.filter(t => t !== tag)
                      places.updateItem(item.url, { tags: item.tags })
                    }
                  })
                  setTimeout(function () {
                    options.onModify()
                  }, 50)
                })
              }
            },
            {
              label: l('deleteBookmarksWithTag'),
              click: function () {
                places.getAllItems(function (items) {
                  items.forEach(function (item) {
                    if (item.tags.includes(tag)) {
                      places.deleteHistory(item.url)
                    }
                  })
                  setTimeout(function () {
                    options.onModify()
                  }, 50)
                })
              }
            }
          ]
        ])
      })
    }
    return el
  },
  render: async function (url, options = {}) {
    bookmarkEditor.currentInstance = {}
    // TODO make places API return a promise
    bookmarkEditor.currentInstance.bookmark = (await new Promise(function (resolve, reject) {
      places.getItem(url, item => resolve(item))
    }))

    var editor = document.createElement('div')
    editor.className = 'bookmark-editor searchbar-item'

    if (options.simplified) {
      editor.className += ' simplified'
    }

    if (!options.simplified) {
      // title input
      var title = document.createElement('span')
      title.className = 'title wide'
      title.textContent = bookmarkEditor.currentInstance.bookmark.title
      editor.appendChild(title)

      // URL
      var URLSpan = document.createElement('div')
      URLSpan.className = 'bookmark-url'
      URLSpan.textContent = bookmarkEditor.currentInstance.bookmark.url
      editor.appendChild(URLSpan)
    }

    // tag area
    var tagArea = document.createElement('div')
    tagArea.className = 'tag-edit-area'
    editor.appendChild(tagArea)

    if (!options.simplified) {
      // save button
      var saveButton = document.createElement('button')
      saveButton.className = 'action-button always-visible i carbon:checkmark'
      saveButton.tabIndex = -1
      editor.appendChild(saveButton)
      saveButton.addEventListener('click', function () {
        editor.remove()
        bookmarkEditor.currentInstance.onClose(bookmarkEditor.currentInstance.bookmark)
        bookmarkEditor.currentInstance = null
      })
    }

    // delete button
    var delButton = document.createElement('button')
    delButton.className = 'action-button always-visible bookmark-delete-button i carbon:trash-can'
    delButton.tabIndex = -1
    editor.appendChild(delButton)
    delButton.addEventListener('click', function () {
      editor.remove()
      bookmarkEditor.currentInstance.onClose(null)
      bookmarkEditor.currentInstance = null
    })

    var tags = {
      selected: [],
      suggested: []
    }

    // show tags
    bookmarkEditor.currentInstance.bookmark.tags.forEach(function (tag) {
      tagArea.appendChild(bookmarkEditor.getTagElement(tag, true, function () {
        places.toggleTag(bookmarkEditor.currentInstance.bookmark.url, tag)
      }))
    })
    tags.selected = bookmarkEditor.currentInstance.bookmark.tags

    places.getSuggestedTags(bookmarkEditor.currentInstance.bookmark.url, function (suggestions) {
      tags.suggested = tags.suggested.concat(suggestions)

      tags.suggested.filter((tag, idx) => {
        return tags.suggested.indexOf(tag) === idx && !tags.selected.includes(tag)
      }).slice(0, 3).forEach(function (tag, idx) {
        tagArea.appendChild(bookmarkEditor.getTagElement(tag, false, function () {
          places.toggleTag(bookmarkEditor.currentInstance.bookmark.url, tag)
        }))
      })
      // add option for new tag
      var newTagInput = document.createElement('input')
      newTagInput.className = 'tag-input'
      newTagInput.placeholder = l('bookmarksAddTag')
      newTagInput.classList.add('mousetrap')
      newTagInput.spellcheck = false
      tagArea.appendChild(newTagInput)

      newTagInput.addEventListener('keypress', function (e) {
        if (e.keyCode !== 8 && e.keyCode !== 13) {
          places.getAllTagsRanked(bookmarkEditor.currentInstance.bookmark.url, function (results) {
            autocomplete.autocomplete(newTagInput, results.map(r => r.tag))
          })
        }
      })

      newTagInput.addEventListener('change', function () {
        var val = this.value
        if (!tags.selected.includes(val)) {
          places.toggleTag(bookmarkEditor.currentInstance.bookmark.url, val)
          tagArea.insertBefore(bookmarkEditor.getTagElement(val, true, function () {
            places.toggleTag(bookmarkEditor.currentInstance.bookmark.url, val)
          }), tagArea.firstElementChild)
        }
        this.value = ''
      })

      if (options.autoFocus) {
        newTagInput.focus()
      }
    })

    return editor
  },
  show: function (url, replaceItem, onClose, options) {
    if (bookmarkEditor.currentInstance) {
      if (bookmarkEditor.currentInstance.editor && bookmarkEditor.currentInstance.editor.parentNode) {
        bookmarkEditor.currentInstance.editor.remove()
      }
      if (bookmarkEditor.currentInstance.onClose) {
        bookmarkEditor.currentInstance.onClose(bookmarkEditor.currentInstance.bookmark)
      }
      bookmarkEditor.currentInstance = null
    }
    bookmarkEditor.render(url, options).then(function (editor) {
      replaceItem.hidden = true
      replaceItem.parentNode.insertBefore(editor, replaceItem)
      bookmarkEditor.currentInstance.editor = editor
      bookmarkEditor.currentInstance.onClose = onClose
    })
  }
}

module.exports = bookmarkEditor
