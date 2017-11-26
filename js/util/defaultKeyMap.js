var defaultKeyMap = {
  'addPrivateTab': 'shift+mod+p',
  'toggleTasks': 'shift+mod+e',
  'goBack': 'mod+left',
  'goForward': 'mod+right',
  'enterEditMode': ['mod+l', 'mod+k'],
  'completeSearchbar': 'mod+enter',
  'closeTab': 'mod+w',
  'restoreTab': 'shift+mod+t',
  'gotoFirstTab': 'shift+mod+9',
  'gotoLastTab': 'mod+9',
  'addToFavorites': 'mod+d',
  'toggleReaderView': 'shift+mod+r',
  'switchToNextTab': ['option+mod+right', 'ctrl+tab', 'shift+mod+pagedown'],
  'switchToPreviousTab': ['option+mod+left', 'shift+ctrl+tab', 'shift+mod+pageup'],
  'switchToNextTask': 'mod+]',
  'switchToPreviousTask': 'mod+[',
  'closeAllTabs': 'shift+mod+n',
  'reload': 'mod+r',
  'showAndHideMenuBar': 'alt',
  'followLink': 'mod+enter'
}
/* Utility function to override default mapping with user settings */
function userKeyMap (settings) {
  var keyMapCopy = Object.assign({}, defaultKeyMap)
  if (settings) {
    // override the default keymap by the user defined ones
    Object.keys(keyMapCopy).forEach(function (key) {
      if (settings[key]) {
        keyMapCopy[key] = settings[key]
      }
    })
  }
  return keyMapCopy
}
