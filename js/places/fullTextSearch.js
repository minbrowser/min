/* global db Dexie historyInMemoryCache calculateHistoryScore */

const stemmer = require('stemmer')

const whitespaceRegex = /\s+/g
const ignoredCharactersRegex = /[']+/g
const nonLetterRegex = /[^a-zA-Z0-9\-_]/g

// Stop words list from https://github.com/weixsong/elasticlunr.js/blob/master/lib/stop_word_filter.js
const stopWords = {
  '': true,
  a: true,
  able: true,
  about: true,
  across: true,
  after: true,
  all: true,
  almost: true,
  also: true,
  am: true,
  among: true,
  an: true,
  and: true,
  any: true,
  are: true,
  as: true,
  at: true,
  be: true,
  because: true,
  been: true,
  but: true,
  by: true,
  can: true,
  cannot: true,
  could: true,
  dear: true,
  did: true,
  do: true,
  does: true,
  either: true,
  else: true,
  ever: true,
  every: true,
  for: true,
  from: true,
  get: true,
  got: true,
  had: true,
  has: true,
  have: true,
  he: true,
  her: true,
  hers: true,
  him: true,
  his: true,
  how: true,
  however: true,
  i: true,
  if: true,
  in: true,
  into: true,
  is: true,
  it: true,
  its: true,
  just: true,
  least: true,
  let: true,
  like: true,
  likely: true,
  may: true,
  me: true,
  might: true,
  most: true,
  must: true,
  my: true,
  neither: true,
  no: true,
  nor: true,
  not: true,
  of: true,
  off: true,
  often: true,
  on: true,
  only: true,
  or: true,
  other: true,
  our: true,
  own: true,
  rather: true,
  said: true,
  say: true,
  says: true,
  she: true,
  should: true,
  since: true,
  so: true,
  some: true,
  than: true,
  that: true,
  the: true,
  their: true,
  them: true,
  then: true,
  there: true,
  these: true,
  they: true,
  this: true,
  tis: true,
  to: true,
  too: true,
  twas: true,
  us: true,
  wants: true,
  was: true,
  we: true,
  were: true,
  what: true,
  when: true,
  where: true,
  which: true,
  while: true,
  who: true,
  whom: true,
  why: true,
  will: true,
  with: true,
  would: true,
  yet: true,
  you: true,
  your: true
}

/* This is used in placesWorker.js when a history item is created */
function tokenize(string) {
  if (!string || typeof string !== 'string') return []
  
  // Combine regex operations to reduce passes
  return string.trim().toLowerCase()
    .replace(ignoredCharactersRegex, '')
    .replace(nonLetterRegex, ' ')
    // Remove diacritics
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(whitespaceRegex)
    .filter(token => !stopWords[token] && token.length <= 100)
    .map(stemmer)
    .slice(0, 20000)
}

// Improved LRU cache implementation
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return undefined
    
    // Get the value and refresh its position
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    // If key exists, refresh its position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // If cache is full, remove the oldest entry (first item in map)
    else if (this.cache.size >= this.maxSize) {
      this.cache.delete(this.cache.keys().next().value)
    }
    
    this.cache.set(key, value)
  }

  has(key) {
    return this.cache.has(key)
  }

  delete(key) {
    return this.cache.delete(key)
  }
}

// Cache for recent search results to improve performance
const searchCache = new LRUCache(50)
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

// Pre-compute item indexes to avoid recalculating during search
const itemIndexCache = new Map()
function getItemIndex(item) {
  if (!itemIndexCache.has(item.id)) {
    const itemText = `${item.url} ${item.title} ${item.tags.join(' ')}`.toLowerCase()
    itemIndexCache.set(item.id, itemText)
  }
  return itemIndexCache.get(item.id)
}

// More efficient heap implementation for top-k results
class TopKHeap {
  constructor(k, compareFn) {
    this.k = k
    this.compareFn = compareFn
    this.heap = []
  }

  push(item) {
    if (this.heap.length < this.k) {
      this._insertItem(item)
    } else if (this.compareFn(item, this.heap[0]) > 0) {
      this.heap[0] = item
      this._siftDown(0)
    }
  }

  _insertItem(item) {
    this.heap.push(item)
    this._siftUp(this.heap.length - 1)
  }

  _siftUp(index) {
    const item = this.heap[index]
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.compareFn(this.heap[parentIndex], item) <= 0) break
      this.heap[index] = this.heap[parentIndex]
      index = parentIndex
    }
    this.heap[index] = item
  }

  _siftDown(index) {
    const item = this.heap[index]
    const length = this.heap.length
    const halfLength = length >>> 1
    
    while (index < halfLength) {
      let childIndex = (index << 1) + 1
      let child = this.heap[childIndex]
      
      if (childIndex + 1 < length && 
          this.compareFn(child, this.heap[childIndex + 1]) > 0) {
        childIndex++
        child = this.heap[childIndex]
      }
      
      if (this.compareFn(item, child) <= 0) break
      
      this.heap[index] = child
      index = childIndex
    }
    
    this.heap[index] = item
  }

  getItems() {
    return [...this.heap].sort((a, b) => this.compareFn(b, a))
  }
}

// More efficient full-text query implementation
async function fullTextQuery(tokens) {
  // Check cache first
  const cacheKey = tokens.sort().join('|')
  const cachedResult = searchCache.get(cacheKey)
  
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY_MS) {
    return cachedResult.result
  }

  try {
    const result = await db.transaction('r', db.places, async () => {
      // Parallel search for all tokens - just select resulting primary keys
      const tokenMatches = await Promise.all(
        tokens.map(prefix => db.places
          .where('searchIndex')
          .equals(prefix)
          .primaryKeys())
      )

      // Convert to Sets for faster lookups
      const tokenMatchSets = tokenMatches.map(keys => new Set(keys))

      // Count of the number of documents containing each token
      const tokenMatchCounts = tokens.reduce((counts, token, i) => {
        counts[token] = tokenMatchSets[i].size
        return counts
      }, {})

      // Create a Map of token sets for fast lookup
      const tokenIdMap = new Map(tokens.map((token, i) => [token, tokenMatchSets[i]]))
      
      // Use a heap to keep track of top 100 results
      const topItems = new TopKHeap(100, (a, b) => calculateHistoryScore(a) - calculateHistoryScore(b))

      // A document matches if each search token is either in the title, URL, tags, or full-text index
      for (const item of historyInMemoryCache) {
        const itemText = getItemIndex(item)
        
        const matched = tokens.every(token => 
          tokenIdMap.get(token).has(item.id) || itemText.includes(token)
        )
        
        if (matched) {
          topItems.push(item)
        }
      }

      // Get top 100 items sorted by score
      const orderedItems = topItems.getItems()
      const orderedIds = orderedItems.map(i => i.id)

      // Get full document data for the top matches
      const documents = await db.places.where('id').anyOf(orderedIds).toArray()
      
      // Sort the documents according to the original order
      const idToIndexMap = new Map(orderedIds.map((id, index) => [id, index]))
      documents.sort((a, b) => idToIndexMap.get(a.id) - idToIndexMap.get(b.id))

      return { documents, tokenMatchCounts }
    })

    // Store in cache
    searchCache.set(cacheKey, { result, timestamp: Date.now() })
    
    return result
  } catch (error) {
    console.error('Full text query error:', error)
    throw error
  }
}

// Optimized snippet generation
function generateSnippet(doc, searchWords) {
  if (!doc.extractedText) return null
  
  // Re-tokenize the query using the less-strict rules used for the snippet
  const snippetSearchWords = searchWords.map(w => stemmer(w.toLowerCase().replace(nonLetterRegex, '')))
  const snippetSearchSet = new Set(snippetSearchWords)
  
  // Pre-tokenize the document text once
  const snippetIndex = doc.extractedText.split(/\s+/g)
  const mappedWords = snippetIndex.map(w => stemmer(w.toLowerCase().replace(nonLetterRegex, '')))
  
  // Use a sliding window approach to find the best snippet
  const windowSize = 10
  let maxScore = 0
  let maxBegin = 0
  let maxEnd = windowSize - 1
  
  // Initial window score
  let currentScore = 0
  const seenWords = new Set()
  
  for (let i = 0; i < Math.min(windowSize, mappedWords.length); i++) {
    if (snippetSearchSet.has(mappedWords[i]) && !seenWords.has(mappedWords[i])) {
      currentScore++
      seenWords.add(mappedWords[i])
    }
  }
  
  maxScore = currentScore
  
  // Slide the window
  for (let i = windowSize; i < mappedWords.length; i++) {
    // Remove the word leaving the window
    const outgoingWord = mappedWords[i - windowSize]
    if (snippetSearchSet.has(outgoingWord)) {
      // Check if this was the only occurrence of the word in the window
      let stillExists = false
      for (let j = i - windowSize + 1; j < i; j++) {
        if (mappedWords[j] === outgoingWord) {
          stillExists = true
          break
        }
      }
      if (!stillExists) {
        seenWords.delete(outgoingWord)
        currentScore--
      }
    }
    
    // Add the word entering the window
    const incomingWord = mappedWords[i]
    if (snippetSearchSet.has(incomingWord) && !seenWords.has(incomingWord)) {
      seenWords.add(incomingWord)
      currentScore++
    }
    
    // Update max if current window is better
    if (currentScore > maxScore) {
      maxScore = currentScore
      maxBegin = i - windowSize + 1
      maxEnd = i
    }
  }
  
  // Find the actual bounds of the matched words
  let actualStart = maxBegin
  let actualEnd = maxEnd
  
  // Find the first and last matched word in the window
  for (let i = maxBegin; i <= maxEnd; i++) {
    if (snippetSearchSet.has(mappedWords[i])) {
      actualStart = i
      break
    }
  }
  
  for (let i = maxEnd; i >= maxBegin; i--) {
    if (snippetSearchSet.has(mappedWords[i])) {
      actualEnd = i
      break
    }
  }
  
  // Expand the snippet context
  maxBegin = Math.max(0, actualStart - 2)
  
  // Try to start at the beginning of a sentence or phrase
  for (let i = maxBegin; i >= Math.max(0, maxBegin - 10); i--) {
    if (snippetIndex[i].endsWith('.') || snippetIndex[i].endsWith(',')) {
      maxBegin = i + 1
      break
    }
  }
  
  const endIndex = Math.min(snippetIndex.length - 1, maxEnd + 5)
  
  return {
    contextBefore: snippetIndex[Math.max(0, actualStart - 1)],
    fragment: snippetIndex.slice(actualStart, actualEnd + 1).join(' '),
    contextAfter: snippetIndex[Math.min(snippetIndex.length - 1, actualEnd + 1)],
    snippet: snippetIndex.slice(maxBegin, endIndex + 1).join(' ') + '...'
  }
}

// Pre-calculated constants for BM25
const k1 = 1.5
const b = 0.75
const avgDocLength = 500 // Estimated average page length

// Optimized full-text search implementation
async function fullTextPlacesSearch(searchText, callback) {
  try {
    const searchWords = tokenize(searchText)
    
    if (searchWords.length === 0) {
      callback([])
      return
    }
    
    const queryResults = await fullTextQuery(searchWords)
    const docs = queryResults.documents
    const totalHistoryItems = historyInMemoryCache.length
    
    // Pre-calculate IDF values
    const idfValues = {}
    for (const word of searchWords) {
      const nqi = queryResults.tokenMatchCounts[word]
      idfValues[word] = Math.log(((totalHistoryItems - nqi + 0.5) / (nqi + 0.5)) + 1)
    }
    
    // Process documents in parallel using Promise.all
    const processedDocs = await Promise.all(docs.map(async doc => {
      // Create a copy to avoid modifying the original
      const processedDoc = { ...doc }
      const indexLen = processedDoc.searchIndex.length
      
      // Find term frequencies
      const termCounts = {}
      const indexPositions = []
      
      // Combine doc searchIndex with title tokens
      const combinedIndex = [...processedDoc.searchIndex, ...tokenize(processedDoc.title)]
      
      for (const word of searchWords) {
        let count = 0
        let pos = 0
        
        while (true) {
          pos = combinedIndex.indexOf(word, pos)
          if (pos === -1) break
          count++
          indexPositions.push(pos)
          pos++
        }
        
        termCounts[word] = count
      }
      
      // Sort positions for proximity calculation
      indexPositions.sort((a, b) => a - b)
      
      // Calculate proximity boost
      let totalWordDistanceBoost = 0
      for (let i = 1; i < indexPositions.length; i++) {
        const distance = indexPositions[i] - indexPositions[i - 1]
        if (distance < 50) {
          totalWordDistanceBoost += Math.pow(50 - distance, 2) * 0.000075
        }
        if (distance === 1) {
          totalWordDistanceBoost += 0.05
        }
      }
      
      // Set initial boost
      processedDoc.boost = Math.min(totalWordDistanceBoost, 7.5)
      
      // Calculate BM25 score
      let bm25 = 0
      for (const word of searchWords) {
        const tf = termCounts[word] || 0
        const idf = idfValues[word]
        const docLengthFactor = (1 - b + (b * (indexLen / avgDocLength)))
        const tfNormalized = (tf * (k1 + 1)) / (tf + (k1 * docLengthFactor))
        
        bm25 += idf * tfNormalized
      }
      
      processedDoc.boost += bm25
      
      // Generate search snippet
      if (processedDoc.extractedText) {
        const snippetInfo = generateSnippet(processedDoc, searchWords)
        if (snippetInfo) {
          processedDoc.searchFragment = {
            contextBefore: snippetInfo.contextBefore,
            fragment: snippetInfo.fragment,
            contextAfter: snippetInfo.contextAfter
          }
          processedDoc.searchSnippet = snippetInfo.snippet
        }
      }
      
      // Remove large properties to reduce transfer size
      delete processedDoc.pageHTML
      delete processedDoc.extractedText
      delete processedDoc.searchIndex
      
      return processedDoc
    }))
    
    callback(processedDocs)
  } catch (error) {
    console.error('Full text search error:', error)
    callback([])
  }
}