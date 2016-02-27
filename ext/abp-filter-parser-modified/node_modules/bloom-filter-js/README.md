# bloom-filter-js

## Installation

    npm install bloom-filter-js

## Usage

```javascript
let BloomFilter = require('bloom-filter-js');

let b = new BloomFilter();
b.add('Brian');
b.add('Ronald');
b.add('Bondy');

// Prints true
console.log(b.exists('Brian'));

// Prints false
console.log(b.exists('Brian Ronald'));

// Serialize to a JSON friendly format
let json = JSON.stringify(b.toJSON());

// Create a new BloomerFilter form a previous serialization
let b2 = BloomFilter.from(JSON.parse(json));

// Will print the same as b.exists
console.log(b2.exists('Brian'));
console.log(b2.exists('Brian Ronald'));

// Char code arrays can be passed in directly too
const toCharCodeArray = (str) => str.split('').map(c => c.charCodeAt(0));
// Will return the same as without converting it to char codes
console.log(b2.exists(toCharCodeArray('Brian')));
console.log(b2.exists(toCharCodeArray('Brian Ronald')));

// And you can check if any substring of a passed string exists
// Returns true
console.log(b.substringExists('Hello my name is Brian', 5));
// Returns false
console.log(b.substringExists('Hello my name is Bri', 3));
```
