jest.dontMock('../main')
  .dontMock('crypto');

let crypto = require("crypto");
let {BloomFilter, toCharCodeArray, setBit, isBitSet, simpleHashFn}  = require('../main');

describe('BloomFilter', function() {
 it('Detects when elements are in the set and not in the set', function() {
   let b = new BloomFilter();
   b.add('Brian');
   b.add('Ronald');
   b.add('Bondy');
   expect(b.exists('Brian')).toBe(true);
   expect(b.exists('Brian2')).toBe(false);
   expect(b.exists('Bria')).toBe(false);

   expect(b.exists('Ronald')).toBe(true);
   expect(b.exists('Ronald2')).toBe(false);
   expect(b.exists('onald')).toBe(false);

   expect(b.exists('Bondy')).toBe(true);
   expect(b.exists('BrianRonaldBondy')).toBe(false);
   expect(b.exists('RonaldBondy')).toBe(false);
 });

 it('can handle very long strings', function() {
   let hashFn1 = (x) => x.reduce((total, x) => total + x, 0);
   let hashFn2 = (x) => x.reduce((total, x) => (total + x) / x, 0);
   let b = new BloomFilter(10, 50000, [hashFn1, hashFn2]);
   let id1 = crypto.randomBytes(2000).toString('hex');
   let id2 = crypto.randomBytes(2000).toString('hex');
   let id3 = crypto.randomBytes(2000).toString('hex');
   b.add(id1);
   b.add(id2);
   expect(b.exists(id1)).toBe(true);
   expect(b.exists(id2)).toBe(true);
   expect(b.exists('hello')).toBe(false);
   expect(b.exists(id3)).toBe(false);
 });

 it('can return false positives for a saturated set', function() {
   let b = new BloomFilter(2, 2);
   for (let i = 0; i < 10; i++) {
     b.add(`test-${i}`);
   }
   expect(b.exists('test')).toBe(true);
 });

 it('it cannot return false negativess', function() {
   let b = new BloomFilter();
   for (let i = 0; i < 10000; i++) {
     b.add(`test-${i}`);
   }
   for (let i = 0; i < 10000; i++) {
     expect(b.exists(`test-${i}`)).toBe(true);
   }
 });

 it('functions properly after serlializing and BloomFilter.from', function() {
   let b = new BloomFilter();
   b.add('hello');
   b.add('world');
   let b2 = BloomFilter.from(b.toJSON());
   expect(b.exists('hello')).toBe(true);
   expect(b.exists('big')).toBe(false);
   expect(b.exists('world')).toBe(true);
 });

 it('supports charcodes being passed in directly to exists', function() {
   let b = new BloomFilter();
   b.add('hello');
   b.add('world');
   expect(b.exists(toCharCodeArray('hello'))).toBe(true);
   expect(b.exists(toCharCodeArray('small'))).toBe(false);
   expect(b.exists(toCharCodeArray('world'))).toBe(true);
 });

 it('supports substringExists', function() {
   let b = new BloomFilter();
   b.add(toCharCodeArray('hello'));
   b.add('world');
   expect(b.substringExists('hello', 5)).toBe(true);
   expect(b.substringExists('ell', 3)).toBe(false);
   expect(b.substringExists(toCharCodeArray('wow ok hello!!!!'), 5)).toBe(true);
   expect(b.substringExists(toCharCodeArray('he!lloworl!d'), 5)).toBe(false);
 });

 it('works with some live examples', function() {
   let b = new BloomFilter();
   b.add('googlesy');
   let url1 = 'http://tpc.googlesyndication.com/safeframe/1-0-2/html/container.html#xpc=sf-gdn-exp-2&p=http%3A//slashdot.org'
   let url2 = 'https://tpc.googlesyndication.com/pagead/gadgets/suggestion_autolayout_V2/suggestion_autolayout_V2.html#t=15174732506449260991&p=http%3A%2F%2Ftpc.googlesyndication.com';
   expect(b.substringExists(' googlesy', 8)).toBe(true);
   expect(b.substringExists(url1, 8)).toBe(true);
   expect(b.substringExists(url2, 8)).toBe(true);
 });

});

describe('toCharCodeArray', function() {
 it('returns an array of proper char codes', function() {
   expect(toCharCodeArray('abr')).toEqual([97, 98, 114]);
   expect(toCharCodeArray('Brian R. Bondy')).toEqual([ 66, 114, 105, 97, 110, 32, 82, 46, 32, 66, 111, 110, 100, 121 ]);
 });
});

describe('simpleHashFn', function() {
 it('generates a simple hash function for the specified prime', function() {
   let h = simpleHashFn(2);
   expect(h([0])).toBe(0);
 });
});

describe('setBit and isBitSet', function() {
 it('can set and read bits properly', function() {
   let a = new Uint8Array(10);
   // First bit in a byte
   expect(isBitSet(a, 0)).toBe(false);
   setBit(a, 0);
   expect(isBitSet(a, 0)).toBe(true);

   // Last bit in a byte
   expect(isBitSet(a, 7)).toBe(false);
   setBit(a, 7);
   expect(isBitSet(a, 7)).toBe(true);
   expect(isBitSet(a, 1)).toBe(false);
   expect(isBitSet(a, 2)).toBe(false);
   expect(isBitSet(a, 3)).toBe(false);
   expect(isBitSet(a, 4)).toBe(false);
   expect(isBitSet(a, 5)).toBe(false);
   expect(isBitSet(a, 6)).toBe(false);
   expect(isBitSet(a, 0)).toBe(true);

   // Second bit in non first byte
   expect(isBitSet(a, 9)).toBe(false);
   setBit(a, 9);
   expect(isBitSet(a, 9)).toBe(true);
   expect(isBitSet(a, 1)).toBe(false);
 });
});

