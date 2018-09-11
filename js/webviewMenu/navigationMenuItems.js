module.exports = function makeNavigationMenuItems () {
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
