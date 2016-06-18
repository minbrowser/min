module('elasticlunr.InvertedIndex');

test('create empty inverted index', function () {
  var invertedIndex = new elasticlunr.InvertedIndex;

  deepEqual(invertedIndex.root, { docs: {}, df: 0 });
  equal(invertedIndex.root.df, 0);
});

test('adding a token to the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc);

  deepEqual(invertedIndex.root['f']['o']['o']['docs'][123], {tf: 1});
  equal(invertedIndex.getDocFreq('foo'), 1);
  equal(invertedIndex.getTermFrequency('foo', 123), 1);
});

test('test hasToken() function', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc);
  ok(invertedIndex.hasToken(token));
  ok(invertedIndex.hasToken('fo'));
  ok(invertedIndex.hasToken('f'));

  ok(!invertedIndex.hasToken('bar'));
  ok(!invertedIndex.hasToken('foo '));
  ok(!invertedIndex.hasToken('foo  '))
});

test('adding another document to the token', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 1},
      doc2 = { ref: 456, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);

  deepEqual(invertedIndex.root['f']['o']['o']['docs'][123], {tf: 1});
  deepEqual(invertedIndex.root['f']['o']['o']['docs'][456], {tf: 1});
  equal(invertedIndex.getTermFrequency('foo', 123), 1);
  equal(invertedIndex.getTermFrequency('foo', 456), 1);
  equal(invertedIndex.getDocFreq('foo'), 2);
});

test('test df of none-existing token', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 1},
      doc2 = { ref: 456, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);

  equal(invertedIndex.getDocFreq('foo'), 2);
  equal(invertedIndex.getDocFreq('fox'), 0);
});

test('adding existing doc', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 1},
      doc2 = { ref: 456, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);
  invertedIndex.addToken(token, { ref: 456, tf: 100});

  deepEqual(invertedIndex.root['f']['o']['o']['docs'][456], {tf: 100});
  equal(invertedIndex.getTermFrequency('foo', 456), 100);
  equal(invertedIndex.getDocFreq('foo'), 2);
});

test('checking if a token exists in the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc);

  ok(invertedIndex.hasToken(token));
});

test('checking if a token does not exist in the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc);
  ok(!invertedIndex.hasToken('fooo'));
  ok(!invertedIndex.hasToken('bar'));
  ok(!invertedIndex.hasToken('fof'));
});

test('retrieving items from the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1},
      token = 'foo';

  invertedIndex.addToken(token, doc);
  deepEqual(invertedIndex.getDocs(token), {
    '123': {tf: 1}
  });

  deepEqual(invertedIndex.getDocs(''), {});

  invertedIndex.addToken('boo', { ref: 234, tf: 100 });
  invertedIndex.addToken('too', { ref: 345, tf: 101 });

  deepEqual(invertedIndex.getDocs(token), {
    '123': {tf: 1}
  });

  invertedIndex.addToken(token, {ref: 234, tf: 100});
  invertedIndex.addToken(token, {ref: 345, tf: 101});

  deepEqual(invertedIndex.getDocs(token), {
    '123': {tf: 1},
    '234': {tf: 100},
    '345': {tf: 101}
  });
});

test('retrieving items that do not exist in the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex;

  deepEqual(invertedIndex.getDocs('foo'), {});
  deepEqual(invertedIndex.getDocs('fox'), {});
});

test('test df of items in the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 1},
      doc2 = { ref: 456, tf: 1},
      doc3 = { ref: 789, tf: 1};

  invertedIndex.addToken('foo', doc1);
  invertedIndex.addToken('foo', doc2);
  invertedIndex.addToken('bar', doc3);

  equal(invertedIndex.getDocFreq('foo'), 2);
  equal(invertedIndex.getDocFreq('bar'), 1);
  equal(invertedIndex.getDocFreq('baz'), 0);
  equal(invertedIndex.getDocFreq('ba'), 0);
  equal(invertedIndex.getDocFreq('b'), 0);
  equal(invertedIndex.getDocFreq('fo'), 0);
  equal(invertedIndex.getDocFreq('f'), 0);
});

test('removing a document from the token invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1};

  deepEqual(invertedIndex.getDocs('foo'), {});

  invertedIndex.addToken('foo', doc);
  deepEqual(invertedIndex.getDocs('foo'), {
    '123': {tf: 1}
  });

  invertedIndex.removeToken('foo', 123);
  deepEqual(invertedIndex.getDocs('foo'), {});
  equal(invertedIndex.getDocFreq('foo'), 0);
  equal(invertedIndex.hasToken('foo'), true);
});

test('removing a document that is not in the invertedIndex', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 1},
      doc2 = { ref: 567, tf: 1};

  invertedIndex.addToken('foo', doc1);
  invertedIndex.addToken('bar', doc2);
  invertedIndex.removeToken('foo', 456);

  deepEqual(invertedIndex.getDocs('foo'), { 123: {tf: 1} });
  equal(invertedIndex.getDocFreq('foo'), 1);
});

test('removing a document from a key that does not exist', function () {
  var invertedIndex = new elasticlunr.InvertedIndex;

  invertedIndex.removeToken('foo', 123);
  ok(!invertedIndex.hasToken('foo'));
  equal(invertedIndex.getDocFreq('foo'), 0);
});

test('expand a token into all descendent tokens', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1};

  invertedIndex.addToken('hell', doc);
  invertedIndex.addToken('hello', doc);
  invertedIndex.addToken('help', doc);
  invertedIndex.addToken('held', doc);
  invertedIndex.addToken('foo', doc);
  invertedIndex.addToken('bar', doc);

  var tokens = invertedIndex.expandToken('hel');
  deepEqual(tokens, ['hell', 'hello', 'help', 'held']);

  tokens = invertedIndex.expandToken('hell');
  deepEqual(tokens, ['hell', 'hello']);

  tokens = invertedIndex.expandToken('he');
  deepEqual(tokens, ['hell', 'hello', 'help', 'held']);

  tokens = invertedIndex.expandToken('h');
  deepEqual(tokens, ['hell', 'hello', 'help', 'held']);
});

test('expand a non existing token', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1};

  invertedIndex.addToken('hell', doc);
  invertedIndex.addToken('hello', doc);
  invertedIndex.addToken('help', doc);
  invertedIndex.addToken('held', doc);
  invertedIndex.addToken('foo', doc);
  invertedIndex.addToken('bar', doc);

  var tokens = invertedIndex.expandToken('wax');
  deepEqual(tokens, []);
});

test('expand a existing token without descendent tokens', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc = { ref: 123, tf: 1};

  invertedIndex.addToken('hello', doc);
  invertedIndex.addToken('hellp', doc);
  invertedIndex.addToken('helld', doc);
  invertedIndex.addToken('helldd', doc);
  invertedIndex.addToken('hellddda', doc);
  invertedIndex.addToken('hell', doc);
  invertedIndex.addToken('help', doc);
  invertedIndex.addToken('held', doc);
  invertedIndex.addToken('foo', doc);
  invertedIndex.addToken('bar', doc);

  var tokens = invertedIndex.expandToken('hello');
  deepEqual(tokens, ['hello']);
});

test('test get term frequency from inverted index', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 2},
      doc2 = { ref: 456, tf: 3},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);

  equal(invertedIndex.getTermFrequency(token, 123), 2);
  equal(invertedIndex.getTermFrequency(token, 456), 3);
  equal(invertedIndex.getTermFrequency(token, 789), 0);
});

test('test get term frequency from inverted index by non-exist token', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 2},
      doc2 = { ref: 456, tf: 3},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);

  equal(invertedIndex.getTermFrequency('token', 123), 0);
  equal(invertedIndex.getTermFrequency('token', 456), 0);
});

test('test get term frequency from inverted index by non-exist docRef', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 2},
      doc2 = { ref: 456, tf: 3},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);

  equal(invertedIndex.getTermFrequency(token, 12), 0);
  equal(invertedIndex.getTermFrequency(token, 23), 0);
  equal(invertedIndex.getTermFrequency(token, 45), 0);
});

test('test get term frequency from inverted index by non-exist token and non-exist docRef', function () {
  var invertedIndex = new elasticlunr.InvertedIndex,
      doc1 = { ref: 123, tf: 2},
      doc2 = { ref: 456, tf: 3},
      token = 'foo';

  invertedIndex.addToken(token, doc1);
  invertedIndex.addToken(token, doc2);

  equal(invertedIndex.getTermFrequency('token', 1), 0);
  equal(invertedIndex.getTermFrequency('abc', 2), 0);
  equal(invertedIndex.getTermFrequency('fo', 123), 0);
});

test('serialisation', function () {
  var invertedIndex = new elasticlunr.InvertedIndex;

  deepEqual(invertedIndex.toJSON(), { root: { docs: {}, df: 0 }});

  invertedIndex.addToken('foo', { ref: 123, tf: 1});

  deepEqual(invertedIndex.toJSON(),
    {
      root: {
        docs: {},
        df: 0,
        f: {
          df: 0,
          docs: {},
          o: {
            df: 0,
            docs: {},
            o: {
              df: 1,
              docs: { 123: { tf: 1} }
            }
          }
        }
      }
    }
  );
});

test('loading a serialised story', function () {
  var serialisedData = {
      root: {
        docs: {},
        df: 0,
        f: {
          df: 0,
          docs: {},
          o: {
            df: 0,
            docs: {},
            o: {
              df: 1,
              docs: { 123: { tf: 1} }
            }
          }
        }
      }
  };

  var invertedIndex = elasticlunr.InvertedIndex.load(serialisedData),
      documents = invertedIndex.getDocs('foo');

  deepEqual(documents, { 123: {tf: 1}});
});
