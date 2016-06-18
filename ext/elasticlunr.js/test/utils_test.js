module('elasticlunr.utils');

test('test if elasticlunr.utils.warn is a function', function () {
  var f = function() {};

  deepEqual(typeof(elasticlunr.utils.warn), typeof(f));
});

test('test toString of null, undefined, void 0', function () {
  var a = null;
  var b = undefined;
  var c = void 0;

  equal(elasticlunr.utils.toString(a), '');
  equal(elasticlunr.utils.toString(b), '');
  equal(elasticlunr.utils.toString(c), '');
});

test('test toString of object', function () {
  var a = {name: 'ella', age: 15};
  var b = {};

  equal(elasticlunr.utils.toString(a), a.toString());
  equal(elasticlunr.utils.toString(b), b.toString());
});

test('test toString of Array', function () {
  var a = [],
      b = [1, 2, 3, 'hello', 'word'],
      c = [1, 2, 3, undefined],
      d = [1, 2, 3, 'hello', undefined],
      e = [1, 2, 3, null],
      f = [1, 2, 3, 'hello', null],
      g = ['hello', 'word'],
      h = ['hello', 'word', null];

  equal(elasticlunr.utils.toString(a), a.toString());
  equal(elasticlunr.utils.toString(b), b.toString());
  equal(elasticlunr.utils.toString(c), c.toString());
  equal(elasticlunr.utils.toString(d), d.toString());
  equal(elasticlunr.utils.toString(e), e.toString());
  equal(elasticlunr.utils.toString(f), f.toString());
  equal(elasticlunr.utils.toString(g), g.toString());
  equal(elasticlunr.utils.toString(h), h.toString());
});

test('test toString of number', function () {
  var a = 0,
      b = -5,
      c = 20,
      e = 1e3,
      d = 1.0,
      f = 2.3,
      g = -3.2;

  equal(elasticlunr.utils.toString(a), a.toString());
  equal(elasticlunr.utils.toString(b), b.toString());
  equal(elasticlunr.utils.toString(c), c.toString());
  equal(elasticlunr.utils.toString(d), d.toString());
  equal(elasticlunr.utils.toString(e), e.toString());
  equal(elasticlunr.utils.toString(f), f.toString());
  equal(elasticlunr.utils.toString(g), g.toString());
});

test('test toString of function', function () {
  var f1 = function() {};
  var f2 = function() {
    var n1 = 2;
    var n2 = 3;
    return n1 + n2;
  };

  var f3 = function(n1, n2) {
    return n1 + n2;
  };

  equal(elasticlunr.utils.toString(f1), f1.toString());
  equal(elasticlunr.utils.toString(f2), f2.toString());
  equal(elasticlunr.utils.toString(f3), f3.toString());
});

test('test toString of String', function () {
  var a = '',
      b = 'hello world',
      c = 'microsoft',
      d = '   abc ',
      e = '%^&*((',
      f = "abc\s ' cd's";

  equal(elasticlunr.utils.toString(a), a);
  equal(elasticlunr.utils.toString(b), b);
  equal(elasticlunr.utils.toString(c), c);
  equal(elasticlunr.utils.toString(d), d);
  equal(elasticlunr.utils.toString(e), e);
  equal(elasticlunr.utils.toString(f), f);
});
