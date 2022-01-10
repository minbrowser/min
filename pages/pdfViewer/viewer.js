pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.js'

var url = new URLSearchParams(window.location.search.replace('?', '')).get('url')

var eventBus = new pdfjsViewer.EventBus()

/* page counter UI */
var pageCounter = {
  init: function () {
    pageCounter.container = document.getElementById('page-counter')
    pageCounter.input = pageCounter.container.getElementsByTagName('input')[0]
    pageCounter.totalEl = pageCounter.container.querySelector('#total')

    pageCounter.container.addEventListener('click', function () {
      pageCounter.input.focus()
      pageCounter.input.select()
    })

    pageCounter.input.addEventListener('change', function (e) {
      var pageIndex = parseInt(this.value) - 1
      if (pageViews[pageIndex] && pageViews[pageIndex].div) {
        pageViews[pageIndex].div.scrollIntoView()
      }
      updateVisiblePages()
      pageCounter.update()
      pageCounter.input.blur()
    })
  },
  show: function () {
    pageCounter.update()
    pageCounter.container.classList.remove('hidden')
  },
  hide: function () {
    pageCounter.container.classList.add('hidden')
  },
  update: function () {
    pageCounter.input.value = currentPage + 1
    pageCounter.totalEl.textContent = pageCount
  }
}

pageCounter.init()

/* progress bar UI */

var progressBar = {
  element: document.getElementById('progress-bar'),
  enabled: false,
  progress: 0,
  incrementProgress: function (progress) { // progress: amount by which to increase the progress bar (number 0-1, 1 = 100%)
    progressBar.progress += progress

    if (!progressBar.enabled) {
      return
    }

    if (progressBar.progress >= 1) {
      progressBar.enabled = false
      progressBar.element.style.transform = 'translateX(0%)'
      setTimeout(function () {
        progressBar.element.hidden = true
      }, 200)
      return
    }

    progressBar.element.hidden = false

    var width = progressBar.progress * 90
    progressBar.element.style.transform = 'translateX(-' + (100 - width) + '%)'
  },
  init: function () {
    setTimeout(function () {
      if (!pdf) {
        progressBar.enabled = true
        progressBar.incrementProgress(0.05)

        var loadingFakeInterval = setInterval(function () { // we can't reliably determine actual download progress, so instead we make the bar move very slowly until the first page has loaded, then show how many pages have rendered
          if (progressBar.progress < 0.125) {
            progressBar.incrementProgress(0.002)
          } else {
            clearInterval(loadingFakeInterval)
          }
        }, 250)
      }
    }, 3000)
  }
}

progressBar.init()

var downloadButton = document.getElementById('download-button')

downloadButton.addEventListener('click', function () {
  downloadPDF()
})

document.querySelectorAll('.side-gutter').forEach(function (el) {
  el.addEventListener('mouseenter', function () {
    showViewerUI()
  })
  el.addEventListener('mouseleave', function () {
    hideViewerUI()
  })
})

function showViewerUI () {
  downloadButton.classList.remove('hidden')
  pageCounter.show()
}

const hideViewerUI = debounce(function () {
  if (!document.querySelector('.side-gutter:hover')) {
    pageCounter.hide()
    downloadButton.classList.add('hidden')
  }
}, 600)

function updateGutterWidths () {
  var gutterWidth
  if (!pageViews[0]) { // PDF hasn't loaded yet
    gutterWidth = 64
  } else {
    gutterWidth = Math.round(Math.max(64, (window.innerWidth - pageViews[0].viewport.width) / 2)) - 2
  }

  document.querySelectorAll('.side-gutter').forEach(function (el) {
    el.style.width = gutterWidth + 'px'
  })
}

function createContainer () {
  var el = document.createElement('div')
  el.classList.add('page-container')
  document.body.appendChild(el)
  return el
}

var pageBuffer = 15

/* adapted from PDFPageView.draw(), without actually painting the page onto the canvas */
function setupPageDom (pageView) {
  var pdfPage = pageView.pdfPage
  var div = pageView.div
  var canvasWrapper = document.createElement('div')
  canvasWrapper.style.width = div.style.width
  canvasWrapper.style.height = div.style.height
  canvasWrapper.classList.add('canvasWrapper')
  if (pageView.annotationLayer && pageView.annotationLayer.div && !pageView.annotationLayer.div.parentNode) {
    div.appendChild(pageView.annotationLayer.div)
  }
  if (pageView.annotationLayer && pageView.annotationLayer.div) {
    div.insertBefore(canvasWrapper, pageView.annotationLayer.div)
  } else {
    div.appendChild(canvasWrapper)
  }
  var textLayer = null
  if (pageView.textLayerFactory) {
    var textLayerDiv = document.createElement('div')
    textLayerDiv.className = 'textLayer'
    textLayerDiv.style.width = canvasWrapper.style.width
    textLayerDiv.style.height = canvasWrapper.style.height
    if (pageView.annotationLayer && pageView.annotationLayer.div) {
      div.insertBefore(textLayerDiv, pageView.annotationLayer.div)
    } else {
      div.appendChild(textLayerDiv)
    }
    textLayer = pageView.textLayerFactory.createTextLayerBuilder(textLayerDiv, pageView.id - 1, pageView.viewport, pageView.enhanceTextSelection)
  }
  if (pageView.annotationLayerFactory) {
    var annotationLayer = pageView.annotationLayerFactory.createAnnotationLayerBuilder(div, pdfPage, null, null, false, pageView.l10n, null, null, null, null, null)
  }
  pageView.textLayer = textLayer
  pageView.annotationLayer = annotationLayer
  setUpPageAnnotationLayer(pageView)
}

function DefaultTextLayerFactory () { }
DefaultTextLayerFactory.prototype = {
  createTextLayerBuilder: function (textLayerDiv, pageIndex, viewport,
    enhanceTextSelection) {
    return new pdfjsViewer.TextLayerBuilder({
      textLayerDiv: textLayerDiv,
      pageIndex: pageIndex,
      viewport: viewport,
      enhanceTextSelection: true,
      eventBus: eventBus
    })
  }
}

var pageViews = []
var pdf = null

const updateCachedPages = throttle(function () {
  if (currentPage == null) {
    return
  }

  if (!pageViews[currentPage].canvas) {
    redrawPageCanvas(currentPage)
  }

  for (var i = 0; i < pageViews.length; i++) {
    (function (i) {
      if (i === currentPage) {
        // already checked above
        return
      }
      if (Math.abs(i - currentPage) > pageBuffer && pageViews[i].canvas) {
        pageViews[i].canvas.remove()
        pageViews[i].canvas = null
      }
      if (Math.abs(i - currentPage) < pageBuffer && !pageViews[i].canvas) {
        redrawPageCanvas(i)
      }
    })(i)
  }
}, 500)

var pageCount

function setUpPageAnnotationLayer (pageView) {
  pageView.annotationLayer.linkService.goToDestination = async function (dest) {
    // Adapted from https://github.com/mozilla/pdf.js/blob/8ac0ccc2277a7c0c85d6fec41c0f3fc3d1a2d232/web/pdf_link_service.js#L238
    let explicitDest
    if (typeof dest === 'string') {
      explicitDest = await pdf.getDestination(dest)
    } else {
      explicitDest = await dest
    }

    const destRef = explicitDest[0]
    let pageNumber

    if (typeof destRef === 'object' && destRef !== null) {
      pageNumber = await pdf.getPageIndex(destRef)
    } else if (Number.isInteger(destRef)) {
      pageNumber = destRef + 1
    }

    pageViews[pageNumber].div.scrollIntoView()
  }
}

pdfjsLib.getDocument({ url: url, withCredentials: true }).promise.then(async function (pdf) {
  window.pdf = pdf

  pageCount = pdf.numPages

  if (pageCount < 25) {
    pageBuffer = 25
  } else {
    pageBuffer = 4
  }

  pdf.getMetadata().then(function (metadata) {
    document.title = metadata.Title || url.split('/').slice(-1)
  })

  for (var i = 1; i <= pageCount; i++) {
    var pageNumber = i

    await pdf.getPage(pageNumber).then(function (page) {
      progressBar.incrementProgress(1 / pageCount)

      var defaultScale = 1.15
      var minimumPageWidth = 625 // px

      var scale = defaultScale

      var viewport = page.getViewport({ scale: scale })

      if (viewport.width * 1.5 > window.innerWidth) {
        scale = (window.innerWidth / viewport.width) * 0.75

        viewport = page.getViewport({ scale: scale })
      }

      if (viewport.width * 1.33 < minimumPageWidth) {
        scale = (minimumPageWidth / viewport.width) * scale * 0.75
        viewport = page.getViewport({ scale: scale })
      }

      if (pageCount > 200) {
        scale = Math.min(scale, 1.1)
        viewport = page.getViewport({ scale: scale })
      }

      var pageContainer = createContainer()
      var pdfPageView = new pdfjsViewer.PDFPageView({
        container: pageContainer,
        id: pageNumber,
        scale: scale,
        defaultViewport: viewport,
        eventBus: eventBus,
        textLayerFactory: new DefaultTextLayerFactory(),
        annotationLayerFactory: new pdfjsViewer.DefaultAnnotationLayerFactory()
      })
      pdfPageView.setPdfPage(page)
      pageViews.push(pdfPageView)

      if (pageNumber === 1) {
        updateGutterWidths()
      }

      (function (pageNumber, pdfPageView) {
        setTimeout(function () {
          if (pageNumber < pageBuffer || (currentPage && Math.abs(currentPage - pageNumber) < pageBuffer)) {
            pageContainer.classList.add('loading')
            pdfPageView.draw().then(function () { setUpPageAnnotationLayer(pdfPageView) }).then(function () {
              pageContainer.classList.remove('loading')
              if (pageNumber === 1) {
                showViewerUI()
                setTimeout(function () {
                  hideViewerUI()
                }, 4000)
              }
            })
            setTimeout(function () {
              pageContainer.classList.remove('loading')
            }, 2000)
          } else {
            setupPageDom(pdfPageView)
            requestIdleCallback(function () {
              pdfPageView.pdfPage.getTextContent({ normalizeWhitespace: true }).then(function (text) {
                pdfPageView.textLayer.setTextContent(text)
                pdfPageView.textLayer.render(0)
                pdfPageView.annotationLayer.render(pdfPageView.viewport, 'display')
              })
            }, { timeout: 10000 })
          }
        }, 100 * (pageNumber - 1))
      })(pageNumber, pdfPageView)
    })
  }
}).catch(function (e) {
  console.warn('error while loading PDF', e)
  // we can't display a preview, offer to download instead
  downloadPDF()
})

var isFindInPage = false

var currentPage = null

function updateVisiblePages () {
  if (isPrinting) {
    return
  }

  var pageRects = new Array(pageViews.length)

  for (var i = 0; i < pageViews.length; i++) {
    pageRects[i] = pageViews[i].div.getBoundingClientRect()
  }

  var ih = window.innerHeight + 80
  var innerHeight = window.innerHeight

  var visiblePages = []

  for (var i = 0; i < pageViews.length; i++) {
    var rect = pageRects[i]
    var textLayer = pageViews[i].textLayer

    if (!isFindInPage && (rect.bottom < -80 || rect.top > ih)) {
      pageViews[i].div.style.visibility = 'hidden'
      if (textLayer) {
        textLayer.textLayerDiv.style.display = 'none'
      }
    } else {
      pageViews[i].div.style.visibility = 'visible'
      if (textLayer) {
        textLayer.textLayerDiv.style.display = 'block'
      }

      if ((rect.top >= 0 && (innerHeight - rect.top) > innerHeight / 2) || (rect.bottom <= innerHeight && rect.bottom > innerHeight / 2) || (rect.top <= 0 && rect.bottom >= innerHeight)) {
        currentPage = i
      }
    }
  }

  if (currentPage !== undefined) {
    updateCachedPages(currentPage)
  }
}

window.addEventListener('scroll', throttle(function () {
  pageCounter.update()
  updateVisiblePages()
}, 50))

/* keep the UI size constant, regardless of the zoom level.
It would probably be better to add API's in Min for this. */

window.addEventListener('resize', function () {
  // this works in Chromium and Safari, but not in Firefox, and it will probably break at some point.
  window.zoomLevel = window.outerWidth / window.innerWidth

  // make UI elements stay a constant size regardless of zoom level
  document.querySelectorAll('.viewer-ui').forEach(function (el) {
    el.style.zoom = 1 / zoomLevel
  })

  updateGutterWidths()
})

function redrawPageCanvas (i, cb) {
  var canvasWrapperNode = pageViews[i].div.getElementsByClassName('canvasWrapper')[0]
  if (!canvasWrapperNode) {
    return
  }
  var oldCanvas = pageViews[i].canvas
  pageViews[i].paintOnCanvas(canvasWrapperNode).promise.then(function () {
    if (oldCanvas) {
      oldCanvas.remove()
    }
    if (cb) { cb() }
  })
}

var isRedrawing = false

function redrawAllPages () {
  if (isRedrawing) {
    console.log('ignoring redraw')
    return
  }

  isRedrawing = true

  var completedPages = 0
  function pageCompleteCallback () {
    completedPages++
    if (completedPages === Math.min(pageCount, pageBuffer)) {
      isRedrawing = false
    }
  }

  var visiblePageList = []
  var invisiblePageList = []

  // redraw the currently visible pages first

  for (var i = 0; i < pageViews.length; i++) {
    if (!pageViews[i].canvas) {
      continue
    }
    var rect = pageViews[i].div.getBoundingClientRect()
    // if the page is visible, add it to the beginning of the redraw list
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      visiblePageList.push(pageViews[i])
    } else {
      invisiblePageList.push(pageViews[i])
    }
  }

  var redrawList = visiblePageList.concat(invisiblePageList)

  for (var i = 0; i < redrawList.length; i++) {
    (function (i) {
      requestIdleCallback(function () {
        redrawPageCanvas(redrawList[i].id - 1, pageCompleteCallback)
      })
    })(i)
  }
}

var lastPixelRatio = window.devicePixelRatio
window.addEventListener('resize', debounce(function () {
  // update visible pages in case the page size was increased
  updateVisiblePages()

  if (window.devicePixelRatio !== lastPixelRatio) { // if the page was zoomed
    lastPixelRatio = window.devicePixelRatio

    redrawAllPages()
    console.log('redraw triggered')
  }
}, 750))

// https://remysharp.com/2010/07/21/throttling-function-calls

function debounce (fn, delay) {
  var timer = null
  return function () {
    var context = this
    var args = arguments
    clearTimeout(timer)
    timer = setTimeout(function () {
      fn.apply(context, args)
    }, delay)
  }
}

function throttle (fn, threshhold, scope) {
  threshhold || (threshhold = 250)
  var last,
    deferTimer
  return function () {
    var context = scope || this

    var now = +new Date()
    var args = arguments
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer)
      deferTimer = setTimeout(function () {
        last = now
        fn.apply(context, args)
      }, threshhold)
    } else {
      last = now
      fn.apply(context, args)
    }
  }
}

function downloadPDF () {
  function startDownload (title) {
    var a = document.createElement('a')
    a.download = title || ''
    a.href = url + '#pdfjs.action=download' // tell Min to download instead of opening in the viewer
    a.click()
  }
  if (pdf) {
    pdf.getMetadata().then(function (data) {
      startDownload(data.info.Title)
    })
  } else {
    // there is no PDF data available
    // this can happen if the download is happening because the file isn't a PDF and we can't show a preview
    // or if the file hasn't loaded yet
    startDownload('')
  }
}

/* printing */

var isPrinting = false

var printPreviousScaleList = []

function afterPrintComplete () {
  for (var i = 0; i < pageViews.length; i++) {
    pageViews[i].viewport = pageViews[i].viewport.clone({ scale: printPreviousScaleList[i] * (4 / 3) })
    pageViews[i].cssTransform(pageViews[i].canvas)
  }
  printPreviousScaleList = []
  isPrinting = false
  updateVisiblePages()
}

function printPDF () {
  var begunCount = 0
  var doneCount = 0

  isPrinting = true

  function onAllRenderingDone () {
    // we can print the document now
    setTimeout(function () {
      window.print()
    }, 100)
  }

  function onPageRenderComplete () {
    doneCount++
    if (doneCount === begunCount) {
      onAllRenderingDone()
    }
  }

  // we can't print very large documents because of memory usage, so offer to download the file instead
  if (pageCount > 100) {
    isPrinting = false
    downloadPDF()
  } else {
    var minimumAcceptableScale = 3.125 / devicePixelRatio
    // redraw each page at a high-enough scale for printing
    for (var i = 0; i < pageViews.length; i++) {
      (function (i) {
        printPreviousScaleList.push(pageViews[i].scale)
        var needsScaleChange = pageViews[i].scale < minimumAcceptableScale

        if (needsScaleChange) {
          pageViews[i].viewport = pageViews[i].viewport.clone({ scale: minimumAcceptableScale * (4 / 3) })
        }

        if (needsScaleChange || !pageViews[i].canvas) {
          begunCount++
          redrawPageCanvas(i, function () {
            if (needsScaleChange) {
              pageViews[i].cssTransform(pageViews[i].canvas)
            }
            onPageRenderComplete()
          })
        }
      })(i)
    }
    if (begunCount === 0) {
      // we don't have to redraw any pages
      onAllRenderingDone()
    }
  }
}

var mediaQueryList = window.matchMedia('print')
mediaQueryList.onchange = function (mql) {
  if (!mql.matches) {
    setTimeout(function () {
      afterPrintComplete()
    }, 1000)
  }
}

/* find in page mode - make all pages visible so that Chromium's search can search the whole PDF */

function startFindInPage () {
  isFindInPage = true

  for (var i = 0; i < pageViews.length; i++) {
    pageViews[i].div.style.visibility = 'visible'
    if (pageViews[i].textLayer) {
      pageViews[i].textLayer.textLayerDiv.style.display = 'block'
    }
  }
}

function endFindInPage () {
  isFindInPage = false
  updateVisiblePages()
}

/* these functions are called from the parent process */

var parentProcessActions = {
  downloadPDF: downloadPDF,
  printPDF: printPDF,
  startFindInPage: startFindInPage,
  endFindInPage: endFindInPage
}
