var browserUI = require('api-wrapper.js')

module.exports = function makeSelectionMenuItems (selection, isPrivate, searchEngine) {
  return [
    {
      label: l('searchWith').replace('%s', searchEngine.name),
      click: function () {
        var newTab = tabs.add({
          url: searchEngine.searchURL.replace('%s', encodeURIComponent(selection)),
          private: isPrivate
        }, tabs.getIndex(tabs.getSelected()) + 1)
        browserUI.addTab(newTab, {
          enterEditMode: false
        })

        webviews.get(newTab).focus()
      }
    }
  ]
}
