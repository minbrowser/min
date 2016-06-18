module('search', {
  setup: function () {
    var idx = new elasticlunr.Index;
    idx.addField('body');
    idx.addField('title');

    ;([{
      id: 'a',
      title: 'Mr. Green kills Colonel Mustard',
      body: 'Mr. Green killed Colonel Mustard in the study with the candlestick. Mr. Green is not a very nice fellow.',
      wordCount: 19
    },{
      id: 'b',
      title: 'Plumb waters green plant ',
      body: 'Professor Plumb has a green plant in his study',
      wordCount: 9
    },{
      id: 'c',
      title: 'Scarlett helps Professor',
      body: 'Miss Scarlett watered Professor Plumbs green plant while he was away from his office last week.',
      wordCount: 16
    },{
      id: 'd',
      title: 'title',
      body: 'handsome',
    },{
      id: 'e',
      title: 'title abc',
      body: 'hand',
    }]).forEach(function (doc) { idx.addDoc(doc); });

    this.idx = idx;
  }
});

test('returning the correct results', function () {
  var results = this.idx.search('green plant');
  equal(results.length, 3);
  equal(results[0].ref, 'b');
});

test('search term not in the index', function () {
  var results = this.idx.search('foo');

  equal(results.length, 0);
});

test('one search term not in the index', function () {
  var results = this.idx.search('foo green')

  equal(results.length, 3);
})

test('search contains one term not in the index', function () {
  var results = this.idx.search('green foo');

  equal(results.length, 3);
});

test('search takes into account boosts', function () {
  var results = this.idx.search('professor');

  equal(results.length, 2);
  equal(results[0].ref, 'c');
});

test('search boosts exact matches', function () {
  var results = this.idx.search('title');

  equal(results.length, 2);
  equal(results[0].ref, 'd');
});
