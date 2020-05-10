# abp-filter-parser
JavaScript Adblock Plus filter parser for lists like EasyList

[![Build Status](https://travis-ci.org/bbondy/abp-filter-parser.svg?branch=master)](https://travis-ci.org/bbondy/abp-filter-parser)

Parses filter rules as per:
- https://adblockplus.org/en/filters
- https://adblockplus.org/en/filter-cheatsheet

## Usage

Babel / ES6:

```javascript
import * as ABPFilterParser from 'abp-filter-parser.js';
```

Node:

```javascript
let ABPFilterParser = require('abp-filter-parser');
```

## Primary API:

```javascript
let ABPFilterParser = require('abp-filter-parser');
var fs = require('fs');

let easyListTxt = fs.readFileSync('./test/data/easylist.txt', 'utf-8');
let parsedFilterData = {};
let urlToCheck = 'http://static.tumblr.com/dhqhfum/WgAn39721/cfh_header_banner_v2.jpg';

// This is the site who's URLs are being checked, not the domain of the URL being checked.
let currentPageDomain = 'slashdot.org';

ABPFilterParser.parse(easyListTxt, parsedFilterData);
// ABPFilterParser.parse(someOtherListOfFilters, parsedFilterData);

if (ABPFilterParser.matches(parsedFilterData, urlToCheck, {
      domain: currentPageDomain,
      elementTypeMaskMap: ABPFilterParser.elementTypes.SCRIPT,
    })) {
  console.log('You should block this URL!');
} else {
  console.log('You should NOT block this URL!');
}
```

## Secondary APIs

You probably won't need these directly, they are used by the parimary API above.

- parseDomains
- parseOptions
- parseHTMLFilter
- parseFilter
- matchesFilter
