const urlParser = require('util/urlParser.js')

const searchbar = require('searchbar/searchbar.js')

let lastItemDeletion = Date.now() // TODO get rid of this

// creates a result item

/*
data:

title: string - the title of the item
metadata: array - a list of strings to include (separated by hyphens) in front of the secondary text
secondaryText: string - the item's secondary text
icon: string - the name of a carbon icon.
image: string - the URL of an image to show
iconImage: string - the URL of an image to show as an icon
descriptionBlock: string - the text in the description block,
attribution: string - attribution text to display when the item is focused
delete: function - a function to call to delete the result item when a left swipe is detected
showDeleteButton - whether to show an [x] button that calls the delete function
button: {icon: string, fn: function} a button that will appear to the right of the item (if showDeleteButton is false)
classList: array - a list of classes to add to the item
fakeFocus - boolean - whether the item should appear to be focused,
colorCircle - string - display a color circle with a given color
opacity - number - the opacity of the item
*/

function createItem (data) {
  const item = document.createElement('div')
  item.classList.add('searchbar-item')

  item.setAttribute('tabindex', '-1')

  if (data.classList) {
    for (let i = 0; i < data.classList.length; i++) {
      item.classList.add(data.classList[i])
    }
  }

  if (data.fakeFocus) {
    item.classList.add('fakefocus')
  }

  if (data.opacity) {
    item.style.opacity = data.opacity
  }

  if (data.colorCircle) {
    const colorCircle = document.createElement('div')
    colorCircle.className = 'image color-circle'
    colorCircle.style.backgroundColor = data.colorCircle

    item.appendChild(colorCircle)
  }

  if (data.icon) {
    const el = document.createElement('i')
    el.className = 'i ' + data.icon
    item.appendChild(el)
  }

  if (data.title) {
    const title = document.createElement('span')
    title.classList.add('title')

    if (!data.secondaryText) {
      title.classList.add('wide')
    }

    title.textContent = data.title.substring(0, 1000)

    item.appendChild(title)
  }

  if (data.secondaryText) {
    const secondaryText = document.createElement('span')
    secondaryText.classList.add('secondary-text')

    secondaryText.textContent = data.secondaryText.substring(0, 1000)

    item.appendChild(secondaryText)

    if (data.metadata) {
      data.metadata.forEach(function (str) {
        const metadataElement = document.createElement('span')
        metadataElement.className = 'md-info'

        metadataElement.textContent = str

        secondaryText.insertBefore(metadataElement, secondaryText.firstChild)
      })
    }
  }

  if (data.image) {
    const image = document.createElement('img')
    image.className = 'image'
    image.src = data.image

    item.insertBefore(image, item.childNodes[0])
  }

  if (data.iconImage) {
    const iconImage = document.createElement('img')
    iconImage.className = 'icon-image'
    iconImage.src = data.iconImage
    iconImage.setAttribute('aria-hidden', true)

    item.insertBefore(iconImage, item.childNodes[0])
  }

  if (data.descriptionBlock) {
    var dBlock = document.createElement('span')
    dBlock.classList.add('description-block')

    dBlock.textContent = data.descriptionBlock
    item.appendChild(dBlock)
  }

  if (data.attribution) {
    const attrBlock = document.createElement('span')
    attrBlock.classList.add('attribution')

    attrBlock.textContent = data.attribution
    if (data.descriptionBlock) {
      // used to make the attribution align with the text even if there's an image on the left
      dBlock.appendChild(attrBlock)
    } else {
      item.appendChild(attrBlock)
    }
  }

  if (data.delete) {
    item.addEventListener('mousewheel', function (e) {
      const self = this
      if (e.deltaX > 50 && e.deltaY < 3 && Date.now() - lastItemDeletion > 700) {
        lastItemDeletion = Date.now()

        self.style.opacity = '0'
        self.style.transform = 'translateX(-100%)'

        setTimeout(function () {
          data.delete(self)
          self.parentNode.removeChild(self)
          lastItemDeletion = Date.now()
        }, 200)
      }
    })

    item.addEventListener('auxclick', function (e) {
      if (e.which === 2) { // middle mouse click
        data.delete(item)
        item.parentNode.removeChild(item)
      }
    })
  }

  // delete button is just a pre-defined action button
  if (data.showDeleteButton) {
    data.button = {
      icon: 'carbon:close',
      fn: function () {
        data.delete(item)
        item.parentNode.removeChild(item)
      }
    }
  }

  if (data.button) {
    const button = document.createElement('button')
    button.classList.add('action-button')
    button.classList.add('ignores-keyboard-focus') // for keyboardNavigationHelper
    button.tabIndex = -1
    button.classList.add('i')
    button.classList.add(data.button.icon)

    button.addEventListener('click', function (e) {
      e.stopPropagation()
      data.button.fn(this)
    })
    item.appendChild(button)
    item.classList.add('has-action-button')
  }

  if (data.click) {
    item.addEventListener('click', data.click)
  }

  // return should act like click
  item.addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      item.click()
    }
  })

  return item
}

function createHeading (data) {
  const heading = document.createElement('h4')
  heading.className = 'searchbar-heading'
  heading.textContent = data.text || ''
  return heading
}

// attempts to shorten a page title, removing unimportant text like the site name
function getRealTitle (text) {
  // don't try to parse URL's
  if (urlParser.isURL(text)) {
    return text
  }

  const possibleCharacters = ['|', ':', ' - ', ' — ']

  for (let i = 0; i < possibleCharacters.length; i++) {
    const char = possibleCharacters[i]
    // match url's of pattern: title | website name
    const titleChunks = text.split(char)

    if (titleChunks.length >= 2) {
      const titleChunksTrimmed = titleChunks.map(c => c.trim())
      if (titleChunksTrimmed[titleChunksTrimmed.length - 1].length < 5 || titleChunksTrimmed[titleChunksTrimmed.length - 1].length / text.length <= 0.3) {
        return titleChunks.slice(0, -1).join(char)
      }
    }
  }

  // fallback to the regular title

  return text
}

module.exports = { createItem, createHeading, getRealTitle }
