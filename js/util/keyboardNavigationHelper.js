/*
Creates a group if items that can be navigated through using arrow keys or the tab key
*/

const keyboardNavigationHelper = {
  groups: {}, // name: [containers]
  moveFocus: function (group, direction) { // 1: forward, -1: backward
    var items = []
    var realFocusItem
    var fakeFocusItem
    keyboardNavigationHelper.groups[group].forEach(function (container) {
      items = items.concat(Array.from(container.querySelectorAll('input:not(.ignores-keyboard-focus), [tabindex="-1"]:not(.ignores-keyboard-focus)')))
      if (!realFocusItem) {
        realFocusItem = container.querySelector(':focus')
      }
      if (!fakeFocusItem) {
        fakeFocusItem = container.querySelector('.fakefocus')
      }
    })

    var currentItem = fakeFocusItem || realFocusItem

    if (!items) {
      return
    }
    if (!currentItem) {
      items[0].focus()
      return
    }

    currentItem.classList.remove('fakefocus')

    while (items.length > 1) {
      var index = items.indexOf(currentItem)

      var nextItem
      if (items[index + direction]) {
        nextItem = index + direction
      } else if (index === 0 && direction === -1) {
        nextItem = items.length - 1
      } else if (index === items.length - 1 && direction === 1) {
        nextItem = 0
      }
      items[nextItem].focus()

      if (document.activeElement !== items[nextItem]) {
        // this item isn't focusable, try again
        items.splice(nextItem, 1)
      } else {
        // done
        break
      }
    }

  },
  handleKeypress: function (group, e) {
    if (e.keyCode === 9 && e.shiftKey) { // shift+tab
      e.preventDefault()
      keyboardNavigationHelper.moveFocus(group, -1)
    } else if (e.keyCode === 9 || e.keyCode === 40) { // tab or arrowdown key
      e.preventDefault()
      keyboardNavigationHelper.moveFocus(group, 1)
    } else if (e.keyCode === 38) { // arrowup key
      e.preventDefault()
      keyboardNavigationHelper.moveFocus(group, -1)
    }
  },
  addToGroup: function (group, container) {
    if (!keyboardNavigationHelper.groups[group]) {
      keyboardNavigationHelper.groups[group] = []
    }

    // insert the containers so that they are ordered based on DOM position
    var pos = 0
    // compareDocumentPosition is a bit of an unusual API
    while (pos <= keyboardNavigationHelper.groups[group].length - 1 && keyboardNavigationHelper.groups[group][pos].compareDocumentPosition(container) & Node.DOCUMENT_POSITION_FOLLOWING) {
      pos++
    }
    keyboardNavigationHelper.groups[group].splice(pos, 0, container)

    container.addEventListener('keydown', function (e) {
      keyboardNavigationHelper.handleKeypress(group, e)
    })
  }
}

module.exports = keyboardNavigationHelper
