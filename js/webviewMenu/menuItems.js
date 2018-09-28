var browserUI = require('api-wrapper.js')

function makeLinkMenuItems (link, isPrivate) {
  if (!link) return undefined

  var linkActions = [
    {
      label: link.length > 60 ? link.substring(0, 60) + '...' : link,
      enabled: false
    }
  ]

  if (!isPrivate) {
    linkActions.push({
      label: l('openInNewTab'),
      click: function () {
        browserUI.addTab(
          tabs.add({ url: link }, tabs.getIndex(tabs.getSelected()) + 1),
          { enterEditMode: false }
        )
      }
    })
  }

  linkActions.push({
    label: l('openInNewPrivateTab'),
    click: function () {
      browserUI.addTab(
        tabs.add(
          { url: link, private: true },
          tabs.getIndex(tabs.getSelected()) + 1
        ),
        { enterEditMode: false }
      )
    }
  })

  return linkActions
}

function makeImageMenuItems (image, isPrivate) {
  if (!image) return undefined

  var imageActions = [
    {
      label: image.length > 60 ? image.substring(0, 60) + '...' : image,
      enabled: false
    }
  ]

  imageActions.push({
    label: l('viewImage'),
    click: function () {
      browserUI.navigate(tabs.getSelected(), image)
    }
  })

  if (!isPrivate) {
    imageActions.push({
      label: l('openImageInNewTab'),
      click: function () {
        browserUI.addTab(
          tabs.add({ url: image }, tabs.getIndex(tabs.getSelected()) + 1),
          { enterEditMode: false }
        )
      }
    })
  }

  imageActions.push({
    label: l('openImageInNewPrivateTab'),
    click: function () {
      browserUI.addTab(
        tabs.add(
          { url: image, private: true },
          tabs.getIndex(tabs.getSelected()) + 1
        ),
        { enterEditMode: false }
      )
    }
  })

  return imageActions
}

function makeSelectionMenuItems (selection, isPrivate, searchEngine) {
  if (!selection) return undefined

  return [
    {
      label: l('searchWith').replace('%s', searchEngine.name),
      click: function () {
        var newTab = tabs.add(
          {
            url: searchEngine.searchURL.replace(
              '%s',
              encodeURIComponent(selection)
            ),
            private: isPrivate
          },
          tabs.getIndex(tabs.getSelected()) + 1
        )
        browserUI.addTab(newTab, {
          enterEditMode: false
        })

        webviews.get(newTab).focus()
      }
    }
  ]
}

function makeNavigationMenuItems () {
  return [
    {
      label: l('goBack'),
      click: function () {
        try {
          webviews.get(tabs.getSelected()).goBack()
        } catch (e) {}
      }
    },
    {
      label: l('goForward'),
      click: function () {
        try {
          webviews.get(tabs.getSelected()).goForward()
        } catch (e) {}
      }
    }
  ]
}

function clipboardMenuItems (link, image, selection, data, clipboard) {
  var clipboardActions = []

  if (link || image) {
    clipboardActions.push({
      label: l('copyLink'),
      click: function () {
        clipboard.writeText(link || image)
      }
    })
  }

  if (selection) {
    clipboardActions.push({
      label: l('copy'),
      click: function () {
        clipboard.writeText(selection)
      }
    })
  }

  if (data.editFlags && data.editFlags.canPaste) {
    clipboardActions.push({
      label: l('paste'),
      click: function () {
        webviews.get(tabs.getSelected()).paste()
      }
    })
  }

  return clipboardActions
}

module.exports = {
  link: makeLinkMenuItems,
  image: makeImageMenuItems,
  selection: makeSelectionMenuItems,
  clipboard: clipboardMenuItems,
  navigation: makeNavigationMenuItems
}
