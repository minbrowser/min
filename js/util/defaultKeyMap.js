var defaultKeyMap = {
  'addPrivateTab': 'shift+mod+p',
  'toggleTasks': 'shift+mod+e',
  'enterEditMode': ['mod+l', 'mod+k'],
  'completeSearchbar': 'mod+enter',
  'gotoFirstTab': 'shift+mod+9',
  'gotoLastTab': 'mod+9',
  'addToFavorites': 'mod+d',
  'toggleReaderView': 'shift+mod+r',
  'switchToNextTab': ['option+mod+right', 'ctrl+tab', 'shift+mod+pagedown'],
  'switchToPreviousTab': ['option+mod+left', 'shift+ctrl+tab', 'shift+mod+pageup'],
  'closeAllTabs': 'shift+mod+n',
}

switch(navigator.platform){
  case 'MacIntel':
    defaultKeyMap.goBack = 'mod+left'
    defaultKeyMap.goForward = 'mod+right'
    defaultKeyMap.reload = 'mod+r'
    break;

  default:
    defaultKeyMap.showMenu = ['option+f', 'option+e']
    defaultKeyMap.goBack = 'option+left'
    defaultKeyMap.goForward = 'option+right'
    defaultKeyMap.reload = ['mod+r', 'f5']
    break;
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
