var fileURLToPath = require('url').fileURLToPath

function isPDFViewerURL (url) {
  return typeof url === 'string' && url.startsWith('min://app/pages/pdfViewer/index.html')
}

function getViewerSourceURL (viewerURL) {
  if (!isPDFViewerURL(viewerURL)) {
    return null
  }

  try {
    var sourceURL = new URLSearchParams(new URL(viewerURL).search).get('url')
    if (!sourceURL) {
      return null
    }

    return new URL(sourceURL)
  } catch (e) {
    return null
  }
}

function getAllowedLocalPDFPath (senderFrameURL, requestedURL) {
  if (!isPDFViewerURL(senderFrameURL)) {
    throw new Error('blocked local PDF read request')
  }

  if (typeof requestedURL !== 'string') {
    throw new Error('invalid PDF URL')
  }

  var requestedFileURL
  try {
    requestedFileURL = new URL(requestedURL)
  } catch (e) {
    throw new Error('invalid PDF URL')
  }

  if (requestedFileURL.protocol !== 'file:') {
    throw new Error('invalid PDF URL protocol')
  }

  var sourceURL = getViewerSourceURL(senderFrameURL)

  if (!sourceURL || sourceURL.protocol !== 'file:' || sourceURL.toString() !== requestedFileURL.toString()) {
    throw new Error('blocked local PDF read request')
  }

  return fileURLToPath(requestedFileURL)
}

module.exports = {
  isPDFViewerURL,
  getViewerSourceURL,
  getAllowedLocalPDFPath
}
