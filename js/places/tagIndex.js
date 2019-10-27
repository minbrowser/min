importScripts('../../ext/bayes-classifier/bayes-classifier.js')

var tagIndex = {
  classifier: new BayesClassifier(),
  tagClassifiers: {},
  tagCounts: {},
  getPageStr: function (page) {
    try {
      var url = new URL(page.url)
      var urlChunk = url.hostname + ' ' + url.pathname
    } catch (e) { }
    var tokens = tokenize(page.title + ' ' + urlChunk.split(/\W/g).join(' '))

    var generic = ['www', 'com', 'net', 'html', 'pdf', 'file']
    tokens = tokens.filter(t => t.length > 2 && !generic.includes(t))

    return tokens.join(' ')
  },
  existingDocs: [],
  addPage: function (page) {
    if (page.tags.length === 0) {
      return
    }

    var str = tagIndex.getPageStr(page)

    // make sure there's a classifier for each tag in this document
    page.tags.forEach(function (tag) {
      if (!tagIndex.tagClassifiers[tag]) {
        tagIndex.tagClassifiers[tag] = new BayesClassifier()
        // add all existing documents
        tagIndex.existingDocs.forEach(function (doc) {
          tagIndex.tagClassifiers[tag].addDocument(doc, 'false')
          tagIndex.tagClassifiers[tag].train()
        })
      }
    })

    // then set the value of each classifier based on this document
    for (var classTag in tagIndex.tagClassifiers) {
      if (page.tags.includes(classTag)) {
        tagIndex.tagClassifiers[classTag].addDocument(str, 'true')
        tagIndex.tagClassifiers[classTag].train()
      } else {
        tagIndex.tagClassifiers[classTag].addDocument(str, 'false')
        tagIndex.tagClassifiers[classTag].train()
      }
    }

    page.tags.forEach(t => {
      if (tagIndex.tagCounts[t]) {
        tagIndex.tagCounts[t]++
      } else {
        tagIndex.tagCounts[t] = 1
      }
    })

    tagIndex.existingDocs.push(str)
  },
  getSuggestedTags: function (page) {
    var tags = []
    var str = tagIndex.getPageStr(page)
    for (var tag in tagIndex.tagClassifiers) {
      var classifications = tagIndex.tagClassifiers[tag].getClassifications(str)
      if (classifications.length !== 2) {
        continue
      }
      var t = classifications.filter(t => t.label === 'true')[0].value
      var f = classifications.filter(t => t.label === 'false')[0].value
      if (t / f > 3 && t > Math.pow(2, -16)) {
        tags.push({ tag: tag, cf: t })
      }
    }
    return tags.sort((a, b) => { return b.cf - a.cf }).map(t => t.tag).filter(t => tagIndex.tagCounts[t] >= 3)
  }
}
