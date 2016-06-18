module('serialisation', {
  setup: function () {
    this.corpus = [{
      id: 'a',
      title: 'Mr. Green kills Colonel Mustard',
      body: 'Mr. Green killed Colonel Mustard in the study with the candlestick. Mr. Green is not a very nice fellow.'
    },{
      id: 'b',
      title: 'Plumb waters plant',
      body: 'Professor Plumb has a green plant in his study'
    },{
      id: 'c',
      title: 'Scarlett helps Professor',
      body: 'Miss Scarlett watered Professor Plumbs green plant while he was away from his office last week.'
    }];
  }
})

test('dumping and loading an index', function () {
  var idx = new elasticlunr.Index;

  idx.addField('title');
  idx.addField('body');

  this.corpus.forEach(function (doc) { 
    idx.addDoc(doc);
  }, this);

  var dumpedIdx = JSON.stringify(idx),
      clonedIdx = elasticlunr.Index.load(JSON.parse(dumpedIdx));

  deepEqual(idx.search('green plant'), clonedIdx.search('green plant'));
});

test('dumping and loading an index with a populated pipeline', function () {
  var idx = elasticlunr(function () {
    this.addField('title');
    this.addField('body');
  });

  this.corpus.forEach(function (doc) { idx.addDoc(doc) });

  var dumpedIdx = JSON.stringify(idx),
      clonedIdx = elasticlunr.Index.load(JSON.parse(dumpedIdx));

  deepEqual(idx.pipeline._stack, clonedIdx.pipeline._stack);
  deepEqual(idx.search('water'), clonedIdx.search('water'));
});
