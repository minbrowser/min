PDFJS.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.js'

var url = new URLSearchParams(window.location.search.replace('?', '')).get('url')

function updatePageCounter() {
  pageCounterInput.value = currentPage + 1;
  pageCounterTotal.textContent = pageCount;
}

var pageCounter = document.getElementById("page-counter");
var pageCounterInput = pageCounter.getElementsByTagName('input')[0];
var pageCounterTotal = pageCounter.querySelector('#total');
var downloadButton = document.getElementById("download-button");

pageCounterInput.addEventListener("change", function (e) {
    var pageIndex = parseInt(this.value) - 1;
    if (pageViews[pageIndex] && pageViews[pageIndex].div) {
      pageViews[pageIndex].div.scrollIntoView();
    }
    updateVisiblePages();
    updatePageCounter();
    pageCounterInput.blur();
})

pageCounter.addEventListener("click", function () {
  pageCounterInput.focus();
  pageCounterInput.select();
})

var progressBar = document.getElementById("progress-bar");

downloadButton.addEventListener("click", function () {
  downloadPDF();
})

document.querySelectorAll(".side-gutter").forEach(function (el) {
  el.addEventListener("mouseenter", function () {
    showViewerUI();
  });
  el.addEventListener("mouseleave", function () {
    hideViewerUI();
  });
})

function showViewerUI() {
  downloadButton.classList.remove("hidden");
  pageCounter.classList.remove("hidden");
  updatePageCounter();
}

const hideViewerUI = debounce(function () {
  if (!document.querySelector(".side-gutter:hover")) {
    pageCounter.classList.add("hidden");
    downloadButton.classList.add("hidden");
  }
}, 600);

function updateGutterWidths() {

  var gutterWidth;
  if (!pageViews[0]) { //PDF hasn't loaded yet
    gutterWidth = 64;
  } else {
    gutterWidth = Math.round(Math.max(64, (window.innerWidth - pageViews[0].viewport.width) / 2)) - 2;
  }

  document.querySelectorAll(".side-gutter").forEach(function (el) {
    el.style.width = gutterWidth + "px";
  })

}

function createContainer() {
  var el = document.createElement('div')
  el.classList.add('page-container')
  document.body.appendChild(el)
  return el
}

var pageBuffer = 15

/* adapted from PDFPageView.draw(), without actually painting the page onto the canvas */
function setupPageDom(pageView) {
  var pdfPage = pageView.pdfPage;
  var div = pageView.div;
  var canvasWrapper = document.createElement('div');
  canvasWrapper.style.width = div.style.width;
  canvasWrapper.style.height = div.style.height;
  canvasWrapper.classList.add('canvasWrapper');
  if (pageView.annotationLayer && pageView.annotationLayer.div) {
    div.insertBefore(canvasWrapper, pageView.annotationLayer.div);
  } else {
    div.appendChild(canvasWrapper);
  }
  var textLayer = null;
  if (pageView.textLayerFactory) {
    var textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = canvasWrapper.style.width;
    textLayerDiv.style.height = canvasWrapper.style.height;
    if (pageView.annotationLayer && pageView.annotationLayer.div) {
      div.insertBefore(textLayerDiv, pageView.annotationLayer.div);
    } else {
      div.appendChild(textLayerDiv);
    }
    textLayer = pageView.textLayerFactory.createTextLayerBuilder(textLayerDiv, pageView.id - 1, pageView.viewport, pageView.enhanceTextSelection);
  }
  pageView.textLayer = textLayer;
}

function DefaultTextLayerFactory() { }
DefaultTextLayerFactory.prototype = {
  createTextLayerBuilder: function (textLayerDiv, pageIndex, viewport,
    enhanceTextSelection) {
    return new PDFJS.TextLayerBuilder({
      textLayerDiv: textLayerDiv,
      pageIndex: pageIndex,
      viewport: viewport,
      enhanceTextSelection: true
    })
  }
}

var pageViews = []
var pdf = null

var progressBarEnabled = false;

setTimeout(function () {
  if (!pdf) {
    progressBar.style.transform = "translateX(-95%)";
    progressBarEnabled = true;
  }
}, 4000);

const updateCachedPages = throttle(function () {
  if (currentPage == null) {
    return
  }

  if (!pageViews[currentPage].canvas) {
    redrawPageCanvas(currentPage);
  }

  for (var i = 0; i < pageViews.length; i++) {
    (function (i) {
      if (i === currentPage) {
        //already checked above
        return;
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
}, 500);

var pageCount;

PDFJS.getDocument({ url: url, withCredentials: true }).then(async function (pdf) {
  window.pdf = pdf

  pageCount = pdf.numPages

  if (pageCount < 25) {
    pageBuffer = 25;
  } else {
    pageBuffer = 4;
  }

  pdf.getMetadata().then(function (metadata) {
    document.title = metadata.Title || url.split('/').slice(-1)
  })

  for (var i = 1; i <= pageCount; i++) {
    var pageNumber = i;

    await pdf.getPage(pageNumber).then(function (page) {

      if (progressBarEnabled) {
        if (pageNumber === pageCount) {
          progressBar.style.transform = "translateX(0%)";
          setTimeout(function () {
            progressBar.hidden = true;
          }, 200);
        } else if (pageCount) {
          var width = (5 + ((pageNumber / pageCount) * 75))
          progressBar.style.transform = "translateX(-" + (100 - width) + "%)";
        }
      }

      var defaultScale = 1.15
      var minimumPageWidth = 625 // px

      var scale = defaultScale

      var viewport = page.getViewport(scale)

      if (viewport.width * 1.5 > window.innerWidth) {
        scale = (window.innerWidth / viewport.width) * 0.75

        viewport = page.getViewport(scale)
      }

      if (viewport.width * 1.33 < minimumPageWidth) {
        scale = (minimumPageWidth / viewport.width) * scale * 0.75
        viewport = page.getViewport(scale)
      }

      if (pageCount > 200) {
        scale = Math.min(scale, 1.1)
        viewport = page.getViewport(scale)
      }

      var pageContainer = createContainer();
      var pdfPageView = new PDFJS.PDFPageView({
        container: pageContainer,
        id: pageNumber,
        scale: scale,
        defaultViewport: viewport,
        textLayerFactory: new DefaultTextLayerFactory(),
        annotationLayerFactory: new PDFJS.DefaultAnnotationLayerFactory(),
      })
      pdfPageView.setPdfPage(page)
      pageViews.push(pdfPageView)

      if (pageNumber === 1) {
        updateGutterWidths();
      }

      function setupPageNavigation(pageView) {
        pageView.annotationLayer.linkService.navigateTo = function (loc) {
          //TODO support more types of links
          if (loc.startsWith('p')) {
            var pageNumber = parseInt(loc.replace('p', ''))
            pageViews[pageNumber].div.scrollIntoView()
          } else {
            console.warn("unsupported link : " + loc);
          }
        }
      }


      (function (pageNumber, pdfPageView) {
        setTimeout(function () {
          if (pageNumber < pageBuffer) {
            pageContainer.classList.add("loading");
            pdfPageView.draw().then(function () { setupPageNavigation(pdfPageView) }).then(function () {
              pageContainer.classList.remove("loading");
              if (pageNumber === 1) {
                showViewerUI();
                setTimeout(function () {
                  hideViewerUI();
                }, 4000);
              }
            })
            setTimeout(function () {
              pageContainer.classList.remove("loading");
            }, 2000);
          } else {
            setupPageDom(pdfPageView);
            requestIdleCallback(function () {
              pdfPageView.pdfPage.getTextContent({ normalizeWhitespace: true }).then(function (text) {
                pdfPageView.textLayer.setTextContent(text)
                pdfPageView.textLayer.render(0)
              })
            }, { timeout: 10000 });
          }
        }, 100 * (pageNumber - 1))
      })(pageNumber, pdfPageView);
    })
  }
})

var isBlurred = false

var currentPage = null

function updateVisiblePages() {
  var pageRects = new Array(pageViews.length);

  for (var i = 0; i < pageViews.length; i++) {
    pageRects[i] = pageViews[i].div.getBoundingClientRect()
  }

  var ih = window.innerHeight + 80;
  var innerHeight = window.innerHeight;

  var visiblePages = [];

  for (var i = 0; i < pageViews.length; i++) {
    var rect = pageRects[i]
    var textLayer = pageViews[i].textLayer

    if (!isBlurred && (rect.bottom < -80 || rect.top > ih)) {
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
        currentPage = i;
      }
    }
  }

  if (currentPage !== undefined) {
    updateCachedPages(currentPage)
  }
}

window.addEventListener('scroll', throttle(function () {
  updatePageCounter();
  updateVisiblePages()
}, 50));

window.addEventListener('blur', function () {
  isBlurred = true

  for (var i = 0; i < pageViews.length; i++) {
    pageViews[i].div.style.visibility = 'visible'
    if (pageViews[i].textLayer) {
      pageViews[i].textLayer.textLayerDiv.style.display = 'block'
    }
  }
})

window.addEventListener('focus', function () {
  isBlurred = false
  updateVisiblePages()
})

/* keep the UI size constant, regardless of the zoom level.
It would probably be better to add API's in Min for this. */

window.addEventListener("resize", function () {
  //this works in Chromium and Safari, but not in Firefox, and it will probably break at some point.
  window.zoomLevel = window.outerWidth / window.innerWidth;

  //make UI elements stay a constant size regardless of zoom level
  document.querySelectorAll(".viewer-ui").forEach(function (el) {
    el.style.zoom = 1 / zoomLevel;
  })

  updateGutterWidths();
})

function redrawPageCanvas(i, cb) {
  var canvasWrapperNode = pageViews[i].div.getElementsByClassName('canvasWrapper')[0]
  if (!canvasWrapperNode) {
    return
  }
  var oldCanvas = pageViews[i].canvas;
  pageViews[i].paintOnCanvas(canvasWrapperNode).promise.then(function () {
    if (oldCanvas) {
      oldCanvas.remove();
    }
    if (cb) { cb() }
  })
}

var isRedrawing = false

function redrawAllPages() {
  if (isRedrawing) {
    console.log('ignoring redraw')
    return
  }

  isRedrawing = true

  var completedPages = 0
  function pageCompleteCallback() {
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

function debounce(fn, delay) {
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

function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
    deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
      args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

function downloadPDF() {
  pdf.getMetadata().then(function (data) {
    var a = document.createElement('a')
    a.download = data.info.Title || ''
    a.href = url + '#pdfjs.action=download' // tell Min to download instead of opening in the viewer
    a.click()
  })
}

// cmd+s should save pdf, not page

document.body.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    downloadPDF()
  }
})