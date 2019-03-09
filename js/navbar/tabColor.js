const colorExtractorImage = document.createElement('img')
const colorExtractorCanvas = document.createElement('canvas')
const colorExtractorContext = colorExtractorCanvas.getContext('2d')

const textColorNN = require('ext/textColor/textColor.js')

const defaultColors = {
  private: ['rgb(58, 44, 99)', 'white'],
  lightMode: ['rgb(255, 255, 255)', 'black'],
  darkMode: ['rgb(40, 44, 52)', 'white']
}

function getColorFromImage (image) {
  const w = colorExtractorImage.width
  const h = colorExtractorImage.height
  colorExtractorCanvas.width = w
  colorExtractorCanvas.height = h

  const offset = Math.max(1, Math.round(0.00032 * w * h))

  colorExtractorContext.drawImage(colorExtractorImage, 0, 0, w, h)

  const data = colorExtractorContext.getImageData(0, 0, w, h).data

  let pixels = {}

  let d, add, sum

  for (let i = 0; i < data.length; i += 4 * offset) {
    d = Math.round(data[i] / 5) * 5 + ',' + Math.round(data[i + 1] / 5) * 5 + ',' + Math.round(data[i + 2] / 5) * 5

    add = 1
    sum = data[i] + data[i + 1] + data[i + 2]

    // very dark or light pixels shouldn't be counted as heavily
    if (sum < 310) {
      add = 0.35
    }

    if (sum < 50) {
      add = 0.01
    }

    if (data[i] > 210 || data[i + 1] > 210 || data[i + 2] > 210) {
      add = 0.5 - (0.0001 * sum)
    }

    if (pixels[d]) {
      pixels[d] = pixels[d] + add
    } else {
      pixels[d] = add
    }
  }

  // find the largest pixel set
  let largestPixelSet = null
  let ct = 0

  for (let k in pixels) {
    if (k === '255,255,255' || k === '0,0,0') {
      pixels[k] *= 0.05
    }
    if (pixels[k] > ct) {
      largestPixelSet = k
      ct = pixels[k]
    }
  }

  let res = largestPixelSet.split(',')

  for (let i = 0; i < res.length; i++) {
    res[i] = parseInt(res[i])
  }

  // dim the colors late at night or early in the morning, or when dark mode is enabled
  let colorChange = 1
  if (hours > 20) {
    colorChange -= 0.015 * Math.pow(2.75, hours - 20)
  } else if (hours < 6.5) {
    colorChange -= -0.15 * Math.pow(1.36, hours) + 1.15
  }

  if (window.isDarkMode) {
    colorChange = Math.min(colorChange, 0.58)
  }

  res[0] = Math.round(res[0] * colorChange)
  res[1] = Math.round(res[1] * colorChange)
  res[2] = Math.round(res[2] * colorChange)

  let isLowContrast = false
  // is this a color that won't change very much when lightened or darkened?
  // TODO is lowContrast the best name for this?
  if (res.filter(i => (i > 235 || i < 15)).length === 3) {
    isLowContrast = true
  }

  return {color: res, isLowContrast}
}

function getHours () {
  const date = new Date()
  return date.getHours() + (date.getMinutes() / 60)
}

let hours = getHours()

// we cache the hours so we don't have to query every time we change the color
setInterval(function () {
  hours = getHours()
}, 5 * 60 * 1000)

function getRGBString (c) {
  return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
}

function getTextColor (bgColor) {
  const obj = {
    r: bgColor[0] / 255,
    g: bgColor[1] / 255,
    b: bgColor[2] / 255
  }
  const output = textColorNN(obj)
  if (output.black > 0.5) {
    return 'black'
  }
  return 'white'
}

function setColor (bg, fg, isLowContrast) {
  const backgroundElements = document.getElementsByClassName('theme-background-color')
  const textElements = document.getElementsByClassName('theme-text-color')

  for (let i = 0; i < backgroundElements.length; i++) {
    backgroundElements[i].style.backgroundColor = bg
  }

  for (let i = 0; i < textElements.length; i++) {
    textElements[i].style.color = fg
  }

  if (fg === 'white') {
    document.body.classList.add('dark-theme')
  } else {
    document.body.classList.remove('dark-theme')
  }
  if (isLowContrast) {
    document.body.classList.add('theme-background-low-contrast')
  } else {
    document.body.classList.remove('theme-background-low-contrast')
  }
}

const tabColor = {
  initialize: function () {
    webviews.bindEvent('page-favicon-updated', function (e, favicons) {
      const id = webviews.getTabFromContents(this)
      tabColor.updateFromImage(favicons, id)
    })

    // theme changes can affect the tab colors
    window.addEventListener('themechange', function (e) {
      tabColor.refresh()
    })

    tasks.on('tab-selected', this.updateColors)
  },
  updateFromImage: function (favicons, tabId) {
    // private tabs always use a special color, we don't need to get the icon
    if (tabs.get(tabId).private === true) {
      return
    }

    requestIdleCallback(function () {
      colorExtractorImage.onload = function (e) {
        const backgroundColor = getColorFromImage(colorExtractorImage)
        const textColor = getTextColor(backgroundColor.color)

        const backgroundString = getRGBString(backgroundColor.color)

        tabs.update(tabId, {
          backgroundColor: backgroundString,
          lowContrastBackground: backgroundColor.isLowContrast,
          foregroundColor: textColor
        })

        if (tabId === tabs.getSelected()) {
          tabColor.updateColors()
        }
      }
      colorExtractorImage.src = favicons[0]
    }, {
      timeout: 1000
    })
  },
  updateColors: function () {
    const tab = tabs.get(tabs.getSelected())

    // private tabs have their own color scheme
    if (tab.private) {
      return setColor(defaultColors.private[0], defaultColors.private[1])
    }

    // use the colors extracted from the page icon
    if (tab.backgroundColor || tab.foregroundColor) {
      return setColor(tab.backgroundColor, tab.foregroundColor, tab.lowContrastBackground)
    }

    // otherwise use the default colors
    if (window.isDarkMode) {
      return setColor(defaultColors.darkMode[0], defaultColors.darkMode[1])
    }
    return setColor(defaultColors.lightMode[0], defaultColors.lightMode[1])
  }
}

module.exports = tabColor
