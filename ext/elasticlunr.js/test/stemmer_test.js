module('elasticlunr.stemmer');

test('should stem words correctly', function () {
  Object.keys(stemmingFixture).forEach(function (word) {
    var expected = stemmingFixture[word];

    equal(elasticlunr.stemmer(word), expected);
  });
});

test('should be registered with elasticlunr.Pipeline', function () {
  equal(elasticlunr.stemmer.label, 'stemmer');
  deepEqual(elasticlunr.Pipeline.getRegisteredFunction('stemmer'), elasticlunr.stemmer);
});
