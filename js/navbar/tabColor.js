var colorExtractorImage = document.createElement('img')
var colorExtractorCanvas = document.createElement('canvas')
var colorExtractorContext = colorExtractorCanvas.getContext('2d')

const textColorNN = require('ext/textColor/textColor.js')

const defaultColors = {
  private: ['rgb(58, 44, 99)', 'white'],
  lightMode: ['rgb(255, 255, 255)', 'black'],
  darkMode: ['rgb(40, 44, 52)', 'white']
}

function getColorFromImage (image) {
  var w = colorExtractorImage.width
  var h = colorExtractorImage.height
  colorExtractorCanvas.width = w
  colorExtractorCanvas.height = h

  var offset = Math.max(1, Math.round(0.00032 * w * h))

  colorExtractorContext.drawImage(colorExtractorImage, 0, 0, w, h)

  var data = colorExtractorContext.getImageData(0, 0, w, h).data

  var pixels = {}

  var d, add, sum

  for (var i = 0; i < data.length; i += 4 * offset) {
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
  var largestPixelSet = null
  var ct = 0

  for (var k in pixels) {
    if (k === '255,255,255' || k === '0,0,0') {
      pixels[k] *= 0.05
    }
    if (pixels[k] > ct) {
      largestPixelSet = k
      ct = pixels[k]
    }
  }

  var res = largestPixelSet.split(',')

  for (var i = 0; i < res.length; i++) {
    res[i] = parseInt(res[i])
  }

  // dim the colors late at night or early in the morning, or when dark mode is enabled
  var colorChange = 1
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

  return res
}

function getHours () {
  const date = new Date()
  return date.getHours() + (date.getMinutes() / 60)
}

var hours = getHours()

// we cache the hours so we don't have to query every time we change the color
setInterval(function () {
  hours = getHours()
}, 5 * 60 * 1000)

function getRGBString (c) {
  return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
}

var getTextColor = function (bgColor) {
  var obj = {
    r: bgColor[0] / 255,
    g: bgColor[1] / 255,
    b: bgColor[2] / 255
  }
  var output = textColorNN(obj)
  if (output.black > 0.5) {
    return 'black'
  }
  return 'white'
}

function setColor (bg, fg) {
  var backgroundElements = document.getElementsByClassName('theme-background-color')
  var textElements = document.getElementsByClassName('theme-text-color')

  for (var i = 0; i < backgroundElements.length; i++) {
    backgroundElements[i].style.backgroundColor = bg
  }

  for (var i = 0; i < textElements.length; i++) {
    textElements[i].style.color = fg
  }

  if (fg === 'white') {
    document.body.classList.add('dark-theme')
  } else {
    document.body.classList.remove('dark-theme')
  }
}

const tabColor = {
  initialize: function () {
    webviews.bindEvent('page-favicon-updated', function (e, favicons) {
      var id = webviews.getTabFromContents(this)
      tabColor.updateFromImage(favicons, id)
    })

    // theme changes can affect the tab colors
    window.addEventListener('themechange', function (e) {
      tabColor.refresh()
    })
  },
  updateFromImage: function (favicons, tabId) {
    // private tabs always use a special color, we don't need to get the icon
    if (tabs.get(tabId).private === true) {
      return
    }

    requestIdleCallback(function () {
      colorExtractorImage.onload = function (e) {
        let backgroundColor = getColorFromImage(colorExtractorImage)
        let textColor = getTextColor(backgroundColor)

        let backgroundString = getRGBString(backgroundColor)

        tabs.update(tabId, {
          backgroundColor: backgroundString,
          foregroundColor: textColor
        })

        if (tabId === tabs.getSelected()) {
          tabColor.refresh()
        }
      }
      colorExtractorImage.src = favicons[0]
    }, {
      timeout: 1000
    })
  },
  refresh: function () {
    var tab = tabs.get(tabs.getSelected())

    // private tabs have their own color scheme
    if (tab.private) {
      return setColor(defaultColors.private[0], defaultColors.private[1])
    }

    // use the colors extracted from the page icon
    if (tab.backgroundColor || tab.foregroundColor) {
      return setColor(tab.backgroundColor, tab.foregroundColor)
    }

    // otherwise use the default colors
    if (window.isDarkMode) {
      return setColor(defaultColors.darkMode[0], defaultColors.darkMode[1])
    }
    return setColor(defaultColors.lightMode[0], defaultColors.lightMode[1])
  }
}

module.exports = tabColor
