#Wiktionary-parser
##retrieving data from wiktionary in javascript

See the [demo](http://palmeral.github.io/wiktionary-parser/demo.html).

###How to use

* Install jQuery (for the JSONP request).

Get definitions for a word:

```
getDictionaryInfo(word, language, callback);
```

Example:

```
/* Get definitions for "Wiktionary" */

getDictionaryInfo("Wiktionary", "English", function (data) {

/* the data returned is the following: */

    {
        "title": "Wiktionary",
            "definitions": [{
            "meaning": "A collaborative project run by the Wikimedia Foundation to produce a free and complete dictionary in every language.",
                "type": "Proper noun"
        }, {
            "meaning": "The dictionaries, collectively, produced by that project.",
                "type": "Proper noun"
        }, {
            "meaning": "A particular version of this dictionary project, written in a certain language, such as the English-language Wiktionary or simply the English Wiktionary.",
                "type": "Proper noun"
        }]
    }

});