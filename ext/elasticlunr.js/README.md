# Elasticlunr.js

[![Build Status](https://travis-ci.org/weixsong/elasticlunr.js.svg?branch=master)](https://travis-ci.org/weixsong/elasticlunr.js)
[![npm version](https://badge.fury.io/js/elasticlunr.svg)](https://badge.fury.io/js/elasticlunr)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/weixsong/elasticlunr.js/master/LICENSE)

Elasticlunr.js is a lightweight full-text search engine developed in JavaScript for browser search and offline search.
Elasticlunr.js is developed based on Lunr.js, but more flexible than lunr.js. Elasticlunr.js provides Query-Time boosting, field search, more rational scoring/ranking methodology, fast computation speed and so on.
Elasticlunr.js is a bit like Solr, but much smaller and not as bright, but also provide flexible configuration, query-time boosting, field search and other features.

# Why You Need Lightweight Offline Search?

1. In some system, you don't want to deploy any **complex full-text search engine**(such as Lucence, Elasticsearch, Sphinx, etc.), you only want to provide some static web pages and provide search functionality , then you could build index in previous and load index in client side(such as Browser).
2. Provide offline search functionality. For some documents, user usually download these documents, you could build index and put index in the documents package, then provide offline search functionality.
3. For some limited or restricted network, such WAN or LAN, offline search is a better choice.
4. For mobile device, Iphone or Android phone, network traffic maybe very expensive, then provide offline search is a good choice.
5. If you want to provide search functionality in your Node.js system, and you don't want to use a complex system, or you only need to support thousands of documents, then Elasticlunr.js is what you want to use.

# Key Features Comparing with Lunr.js

1. **Query-Time Boosting**, you don't need to setup boosting weight in index building procedure, Query-Time Boosting make it more flexible that you could try different boosting scheme.
2. **More Rational Scoring Mechanism**, Elasticlunr.js use quite the same scoring mechanism as Elasticsearch, and also this scoring mechanism is used by lucene. 
3. **Field-Search**, you could choose which field to index and which field to search.
4. **Boolean Model**, you could set which field to search and the boolean model for each query token, such as "OR", "AND".
5. **Combined Boolean Model, TF/IDF Model and the Vector Space Model**, make the results ranking more reliable.
6. **Fast**, Elasticlunr.js removed TokenCorpus and Vector from lunr.js, by using combined model there is **no** need to compute the vector of a document and query string to compute similarity of query and matched document, this improve the search speed significantly.
7. **Small Index Size**, Elasticlunr.js did not store TokenCorpus because there is no need to compute query vector and document vector, then the index file is small, and also user could choose if they need to store the origianl JSON doc, if user care more about the index size, they could choose not store the original JSON doc, this could reduce the index size significantly. This is especially helpful when elasticlunr.js is used as offline search. The index size is about half size of lunr.js index file.

## Example

A very simple search index can be created using the following scripts:

```javascript
var index = elasticlunr(function () {
    this.addField('title');
    this.addField('body');
    this.setRef('id');
});
```

Adding documents to the index is as simple as:

```javascript
var doc1 = {
    "id": 1,
    "title": "Oracle released its latest database Oracle 12g",
    "body": "Yestaday Oracle has released its new database Oracle 12g, this would make more money for this company and lead to a nice profit report of annual year."
}

var doc2 = {
    "id": 2,
    "title": "Oracle released its profit report of 2015",
    "body": "As expected, Oracle released its profit report of 2015, during the good sales of database and hardware, Oracle's profit of 2015 reached 12.5 Billion."
}

index.addDoc(doc1);
index.addDoc(doc2);
```

Then searching is as simple:

```javascript
index.search("Oracle database profit");
```

Also, you could do query-time boosting by passing in a configuration.

```javascript
index.search("Oracle database profit", {
    fields: {
        title: {boost: 2},
        body: {boost: 1}
    }
});
```

This returns a list of matching documents with a score of how closely they match the search query:

```javascript
[{
    "ref": 1,
    "score": 0.5376053707962494
},
{
    "ref": 2,
    "score": 0.5237481076838757
}]
```

If user do not want to store the original JSON documents, they could use the following setting:
```javascript
var index = elasticlunr(function () {
    this.addField('title');
    this.addField('body');
    this.setRef('id');
    this.saveDocument(false);
});
```

Then elasticlunr.js will not store the JSON documents, this will reduce the index size, but also bring some inconvenience such as update a document or delete a document by document id or reference. Actually most of the time user will not udpate or delete a document from index. 

[API documentation](http://elasticlunr.com/docs/index.html) is available, as well as a [full working example](http://elasticlunr.com/example/index.html).

## Description

Elasticlunr.js is developed based on Lunr.js, but more flexible than lunr.js. Elasticlunr.js provides Query-Time Boosting, Field Search, more rational scoring/ranking methodology, flexible configuration and so on.
A bit like Solr, but much smaller and not as bright, but also provide flexible configuration, query-time boosting, field search, etc.

## Installation

Simply include the elasticlunr.js source file in the page that you want to use it.  Elasticlunr.js is supported in all modern browsers.

Browsers that do not support ES5 will require a JavaScript shim for Elasticlunr.js to work. You can either use [Augment.js](https://github.com/olivernn/augment.js), [ES5-Shim](https://github.com/kriskowal/es5-shim) or any library that patches old browsers to provide an ES5 compatible JavaScript environment.

# Documentation

This part only contain important apects of elasticlunr.js, for the whole documentation, please go to [API documentation](http://elasticlunr.com/docs/index.html).

## 1. Build Index

When you first create a index instance, you need to specify which field you want to index. If you did not specify which field to index, then no field will be searchable for your documents.
You could specify fields by:
```javascript
var index = elasticlunr(function () {
    this.addField('title');
    this.addField('body');
    this.setRef('id');
});
```

You could also set the document reference by <code>this.setRef('id')</code>, if you did not set document ref, elasticlunr.js will use **'id'** as default.

You could do the above index setup as followings:
```javascript
var index = elasticlunr();
index.addField('title');
index.addField('body');
index.setRef('id');
```

Also you could choose not store the original JSON document to reduce the index size by:
```javascript
var index = elasticlunr();
index.addField('title');
index.addField('body');
index.setRef('id');
index.saveDocument(false);
```

Default supported language of elasticlunr.js is English, if you want to use elasticlunr.js to index other language documents, then you need to use elasticlunr.js combined with [lunr-languages](https://github.com/weixsong/lunr-languages).
Assume you're using lunr-language in Node.js envrionment, you could import lunr-language as followings:

```javascript
var elasticlunr = require('elasticlunr');
require('./lunr.stemmer.support.js')(elasticlunr);
require('./lunr.de.js')(elasticlunr);

var index = elasticlunr(function () {
    // use the language (de)
    this.use(lunr.de);
    // then, the normal elasticlunr index initialization
    this.addField('title')
    this.addField('body')
});
```
For more details, please go to [lunr-languages](https://github.com/weixsong/lunr-languages).

## 2. Add document to index

Add document to index is very simple, just prepare you document in JSON format, then add it to index.

```javascript
var doc1 = {
    "id": 1,
    "title": "Oracle released its latest database Oracle 12g",
    "body": "Yestaday Oracle has released its new database Oracle 12g, this would make more money for this company and lead to a nice profit report of annual year."
}

var doc2 = {
    "id": 2,
    "title": "Oracle released its profit report of 2015",
    "body": "As expected, Oracle released its profit report of 2015, during the good sales of database and hardware, Oracle's profit of 2015 reached 12.5 Billion."
}

index.addDoc(doc1);
index.addDoc(doc2);
```

If your JSON document contains field that not configured in index, then that field will not be indexed, which means that field is not searchable.

## 3. Remove document from index

Elasticlunr.js support remove a document from index, just provide JSON document to <code>elasticlunr.Index.prototype.removeDoc()</code> function.

For example:
```javascript
var doc = {
    "id": 1,
    "title": "Oracle released its latest database Oracle 12g",
    "body": "Yestaday Oracle has released its new database Oracle 12g, this would make more money for this company and lead to a nice profit report of annual year."
}

index.removeDoc(doc);
```

Remove a document will remove each token of that document's each field from field-specified inverted index.

## 4. Update a document in index
Elasticlunr.js support update a document in index, just provide JSON document to <code>elasticlunr.Index.prototype.update()</code> function.

For example:
```javascript
var doc = {
    "id": 1,
    "title": "Oracle released its latest database Oracle 12g",
    "body": "Yestaday Oracle has released its new database Oracle 12g, this would make more money for this company and lead to a nice profit report of annual year."
}

index.update(doc);
```

## 5. Query from Index

Elasticlunr.js provides flexible query configuration, supports query-time boosting and Boolean logic setting.
You could setup a configuration tell elasticlunr.js how to do query-time boosting, which field to search in, how to do the boolean logic.
Or you could just use it by simply provide a query string, this will aslo works perfectly because the scoring mechanism is very efficient.

### 5.1 Simple Query

**Because elasticlunr.js has a very perfect scoring mechanism, so for most of your requirement, simple search would be easy to meet your requirement.**

```javascript
index.search("Oracle database profit");
```

Output is a results array, each element of results array is an Object contain a <code>ref</code> field and a <code>score</code> field.
<code>ref</code> is the document reference.
<code>score</code> is the similarity measurement.

Results array is sorted descent by <code>score</code>.

### 5.2 Configuration Query

#### 5.2.1 **Query-Time Boosting**

Setup which fields to search in by passing in a JSON configuration, and setup boosting for each search field.
If you setup this configuration, then elasticlunr.js will only search the query string in the specified fields with boosting weight.

**The scoring mechanism used in elasticlunr.js is very complex**, please goto [details](https://www.elastic.co/guide/en/elasticsearch/guide/current/practical-scoring-function.html) for more information.


```javascript
index.search("Oracle database profit", {
    fields: {
        title: {boost: 2},
        body: {boost: 1}
    }
});
```

#### 5.2.2 **Boolean Model**

Elasticlunr.js also support boolean logic setting, if no boolean logic is setted, elasticlunr.js use "OR" logic defaulty. By "OR" default logic, elasticlunr.js could reach a high **Recall**.

```javascript
index.search("Oracle database profit", {
    fields: {
        title: {boost: 2},
        body: {boost: 1}
    },
    bool: "OR"
});
```

Boolean model could be setted by global level such as the above setting or it could be setted by field level, if both global and field level contains a "bool" setting, field level setting will overwrite the global setting.
```javascript
index.search("Oracle database profit", {
    fields: {
        title: {boost: 2, bool: "AND"},
        body: {boost: 1}
    },
    bool: "OR"
});
```
The above setting will search <code>title</code> field by **AND** model and other fields by "OR" model.
Currently if you search in multiply fields, resutls from each field will be merged together to give the query results. In the future elasticlunr will support configuration that user could set how to combine the results from each field, such as "most_field" or "top_field".

#### 5.2.3 **Token Expandation**
Sometimes user want to expand a query token to increase **RECALL**, then user could set expand model to **true** by configuration, default is **false**.
For example, user query token is "micro", and assume "microwave" and "microscope" are in the index, then is user choose expand the query token "micro" to increase **RECALL**, both "microwave" and "microscope" will be returned and search in the index.
The query results from expanded tokens are penalized because they are not exactly the same as the query token.
```javascript
index.search("micro", {
    fields: {
        title: {boost: 2, bool: "AND"},
        body: {boost: 1}
    },
    bool: "OR",
    expand: true
});
```

Field level expand configuration will overwrite global expand configuration.
```javascript
index.search("micro", {
    fields: {
        title: {
            boost: 2,
            bool: "AND",
            expand: false
        },
        body: {boost: 1}
    },
    bool: "OR",
    expand: true
});
```

## 6. Add customized stop words

Elasticlunr.js contains some default stop words of English, such as:
* a
* about
* an
* all
* also
* and
* any
* but
* the
* ...

Defaultly elasticlunr.js contains **120** stop words, user could decide not use these default stop words or add customized stop words.

### 6.1 Remove default stop words

You could remove default stop words simply as:
```javascript
elasticlunr.clearStopWords();
```

### 6.2 Add customized stop words

User could add a list of customized stop words.
```javascript
var customized_stop_words = ['an', 'hello', 'xyzabc'];
elasticlunr.addStopWords(customized_stop_words);
```

## 7. Use elasticlunr in Node.js

Elasticlunr support Node.js, you could use elastilunr in node.js as a node-module.

Install elasticlunr by:
```javascript
npm install elasticlunr
```

then in your node.js project or in node.js console:
```javascript
var elasticlunr = require('elasticlunr');

var index = elasticlunr(function () {
    this.addField('title')
    this.addField('body')
});

var doc1 = {
    "id": 1,
    "title": "Oracle released its latest database Oracle 12g",
    "body": "Yestaday Oracle has released its new database Oracle 12g, this would make more money for this company and lead to a nice profit report of annual year."
}

var doc2 = {
    "id": 2,
    "title": "Oracle released its profit report of 2015",
    "body": "As expected, Oracle released its profit report of 2015, during the good sales of database and hardware, Oracle's profit of 2015 reached 12.5 Billion."
}

index.addDoc(doc1);
index.addDoc(doc2);

index.search("Oracle database profit");
```

# Contributing

See the [`CONTRIBUTING.mdown` file](CONTRIBUTING.mdown).
