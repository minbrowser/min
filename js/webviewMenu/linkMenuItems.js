var browserUI = require('api-wrapper.js')

module.exports = function makeLinkMenuItems (link, isPrivate) {
  if (!link) return undefined

  var linkActions = [
    {
      label: (link.length > 60) ? link.substring(0, 60) + '...' : link,
      enabled: false
    }
  ]

  if (!isPrivate) {
    linkActions.push({
      label: l('openInNewTab'),
      click: function () {
        browserUI.addTab(tabs.add({ url: link }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
      }
    })
  }

  linkActions.push({
    label: l('openInNewPrivateTab'),
    click: function () {
      browserUI.addTab(tabs.add({ url: link, private: true }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
    }
  })

  return linkActions
}
