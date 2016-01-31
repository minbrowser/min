//defines schema for the browsingData database
//requires Dexie.min.js

var db = new Dexie('browsingData');

db.version(2)
	.stores({
		bookmarks: 'url, title, text, extraData', //url must come first so it is the primary key
		history: 'url, title, color, visitCount, lastVisit, extraData', //same thing
		readingList: 'url, time, visitCount, pageHTML, article, extraData', //article is the object from readability
	});

db.open().then(function () {
	console.log("database opened ", performance.now());
});

Dexie.Promise.on("error", function (error) {
	console.warn("database error occured", error);
});
