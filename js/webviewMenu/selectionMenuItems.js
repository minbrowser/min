var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

module.exports = function makeSelectionMenuItems (selection, isPrivate, searchEngine) {
  if (!Menu || !MenuItem || !clipboard) {
    Menu = remote.Menu
    MenuItem = remote.MenuItem
    clipboard = remote.clipboard
  }

  return [
    new MenuItem({
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
    })
  ]
}
