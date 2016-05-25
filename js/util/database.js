// defines schema for the browsingData database
// requires Dexie.min.js

var db = new Dexie('browsingData')

// old version
db.version(2).stores({
  bookmarks: 'url, title, text, extraData', // url must come first so it is the primary key
  history: 'url, title, color, visitCount, lastVisit, extraData', // same thing
  readingList: 'url, time, visitCount, pageHTML, article, extraData' // article is the object from readability
})

// current version
db.version(3).stores({
  bookmarks: 'url, title, text, extraData', // url must come first so it is the primary key
  history: 'url, title, color, visitCount, lastVisit, extraData', // same thing
  readingList: 'url, time, visitCount, pageHTML, article, extraData', // article is the object from readability
  settings: 'key, value' // key is the name of the setting, value is an object
})

/* current settings:

key - filtering
value - {trackers: boolean, contentTypes: array} */

db.open().then(function () {
  console.log('database opened ', performance.now())
})

Dexie.Promise.on('error', function (error) {
  console.warn('database error occured', error)
})
