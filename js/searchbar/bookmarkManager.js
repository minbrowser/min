var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var places = require('places/places.js')
var urlParser = require('util/urlParser.js')
var { db } = require('util/database.js')
var formatRelativeDate = require('util/relativeDate.js')

function getTagText(text) {
  return text.split(/\s/g).filter(function (word) {
    return word.startsWith("#") && word.length > 1
  }).map(t => t.substring(1));
}
/*
async function showTagSuggestions(container) {
  var inputTags = getTagText(searchbar.getValue());
  var tags = await db.places.orderBy("tags").keys()

  var tagMap = {}
  tags.forEach(function(tag) {
    if (tagMap[tag]) {
      tagMap[tag]++;
    } else {
      tagMap[tag] = 1;
    }
  })

  var sortedTags = Object.keys(tagMap).sort((a, b) => {return tagMap[a] > tagMap[b]})

  sortedTags.slice(0, 8).forEach(function(tag) {
    var el = getTagElement(tag, false, function() {
      alert(tag);
    })
    container.appendChild(el);
  })
}
*/
function getTagElement(tag, selected, onClick) {
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
    onClick();
    if (el.classList.contains('selected')) {
      el.remove()
    } else {
      el.classList.add('selected')
    }
  })
  return el
}

async function getBookmarkEditor(url, closeFn) {
  var bookmark = await db.places.where('url').equals(url).first();

  var editor = document.createElement('div')
  editor.className = 'bookmark-editor searchbar-item'

  //title input
  var title = document.createElement("span")
  title.className = "title wide";
  title.textContent = bookmark.title;
  editor.appendChild(title);

  //URL
  var URLSpan = document.createElement("div")
  URLSpan.className = "bookmark-url";
  URLSpan.textContent = bookmark.url;
  editor.appendChild(URLSpan);

  //save button
  var saveButton = document.createElement('button')
  saveButton.className = "fa fa-check action-button";
  saveButton.tabIndex = -1
  editor.appendChild(saveButton);
  saveButton.addEventListener("click", function(e) {
    editor.remove();
    closeFn(e, bookmark);
  });

  //delete button
  var delButton = document.createElement('button')
  delButton.className = "fa fa-trash action-button bookmark-delete-button";
  delButton.tabIndex = -1
  editor.appendChild(delButton);
  delButton.addEventListener("click", function(e) {
    editor.remove();
    places.deleteHistory(url);
    closeFn(e, null);
  });

  //tag area
  var tagArea = document.createElement('div')
  tagArea.className = 'tag-edit-area'
  editor.appendChild(tagArea)

  var tags = {
    selected: [],
    suggested: []
  }

  // show tags
  bookmark.tags.forEach(function (tag) {
    tagArea.appendChild(getTagElement(tag, true, function() {
      places.toggleTag(bookmark.url, tag)
    }))
  })
  tags.selected = bookmark.tags

  places.getSuggestedTags(bookmark.url, function(suggestions) {
    tags.suggested = tags.suggested.concat(suggestions)

    tags.suggested.filter((tag, idx) => {
      return tags.suggested.indexOf(tag) === idx && !tags.selected.includes(tag)
    }).slice(0, 3).forEach(function (tag, idx) {
      tagArea.appendChild(getTagElement(tag, false, function() {
        places.toggleTag(bookmark.url, tag)
      }))
    })
    // add option for new tag
    var newTagInput = document.createElement('input')
    newTagInput.className = 'tag-input'
    newTagInput.placeholder = 'Add tag...'
    newTagInput.classList.add('mousetrap')
    tagArea.appendChild(newTagInput)
    newTagInput.addEventListener('change', function () {
      if (!tags.selected.includes(this.value)) {
        places.toggleTag(bookmark.url, this.value)
        tagArea.insertBefore(getTagElement(this.value, true), tagArea.firstElementChild)
      }
      this.value = ''
    })
  })

  return editor;
}

function showBookmarkEditor(url, item) {
  getBookmarkEditor(url, function onClose(e, newBookmark) {
    if (newBookmark) {
      item.parentNode.replaceChild(getBookmarkListItem(newBookmark), item);
    } else {
      item.remove();
    }
  }).then(function (editor) {
    item.hidden = true;
    item.parentNode.insertBefore(editor, item);
  })
}

function getBookmarkListItem(result, focus) {
  var item = searchbarUtils.createItem({
    title: result.title,
    icon: 'fa-star',
    secondaryText: urlParser.getSourceURL(result.url),
    fakeFocus: focus,
    click: function (e) {
      if (!item.classList.contains('editing')) {
        searchbar.openURL(result.url, e)
      }
    },
    classList: ['bookmark-item'],
    delete: function () {
      places.deleteHistory(result.url)
    },
    button: {
      icon: 'fa-pencil',
      fn: function (el) {
        showBookmarkEditor(result.url, item)
      }
    }
  })
  return item;
}

bangsPlugin.registerCustomBang({
  phrase: '!bookmarks',
  snippet: l('searchBookmarks'),
  isAction: false,
  showSuggestions: function (text, input, event) {
    var container = searchbarPlugins.getContainer('bangs')

    var originalText = text;

    // filter out tags from the typed text
    var searchedTags = getTagText(text);
    searchedTags.forEach(function (word) {
        text = text.replace("#" + word, '')
    })

 //   showTagSuggestions(searchbarPlugins.topAnswerArea);

 var displayedURLset = []
    places.searchPlaces(text, function (results) {
      searchbarPlugins.reset('bangs')

      var tagBar = document.createElement("div");
      container.appendChild(tagBar);

      places.autocompleteTags(searchedTags, function(suggestedTags) {
        suggestedTags.forEach(function(suggestion) {
          tagBar.appendChild(getTagElement(suggestion, false, function() {
            tabBar.enterEditMode(tabs.getSelected(), "!bookmarks " + originalText + " #" + suggestion);
          }))
        })
      });

      var lastRelativeDate = '' // used to generate headings

      results.sort(function (a, b) {
        // order by last visit
        return b.lastVisit - a.lastVisit
      }).forEach(function (result, index) {
        for (var i = 0; i < searchedTags.length; i++) {
          if (!result.tags.filter(t => t.startsWith(searchedTags[i])).length) {
            return
          }
        }

        displayedURLset.push(result.url);

        var thisRelativeDate = formatRelativeDate(result.lastVisit)
        if (thisRelativeDate !== lastRelativeDate) {
          searchbarPlugins.addHeading('bangs', { text: thisRelativeDate })
          lastRelativeDate = thisRelativeDate
        }
        var item = getBookmarkListItem(result, index === 0 && text);
        container.appendChild(item)
      })

      places.getSuggestedItemsForTags(searchedTags, function(suggestedResults) {
        suggestedResults = suggestedResults.filter(res => !displayedURLset.includes(res.url));
        if (suggestedResults.length === 0) {
          return;
        }
        searchbarPlugins.addHeading('bangs', { text: "Similar items" })
        suggestedResults.sort(function (a, b) {
          // order by last visit
          return b.lastVisit - a.lastVisit
        }).forEach(function (result, index) {
          var item = getBookmarkListItem(result, false);
          container.appendChild(item)
        })
      })
    }, { searchBookmarks: true, limit: (text ? 100 : Infinity) })
  },
  fn: function (text) {
    if (!text) {
      return
    }
    places.searchPlaces(text, function (results) {
      if (results.length !== 0) {
        results = results.sort(function (a, b) {
          return b.lastVisit - a.lastVisit
        })
        searchbar.openURL(results[0].url, null)
      }
    }, { searchBookmarks: true })
  }
})
