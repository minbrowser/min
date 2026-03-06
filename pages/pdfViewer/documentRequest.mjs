export function getPDFDocumentRequest (targetURL, requestLocalPDFData) {
  if (typeof targetURL !== 'string') {
    return Promise.reject(new Error('invalid PDF URL'))
  }

  if (targetURL.startsWith('file://')) {
    return requestLocalPDFData(targetURL).then(function (fileData) {
      return {
        data: fileData
      }
    })
  }

  return Promise.resolve({
    url: targetURL,
    withCredentials: true
  })
}
