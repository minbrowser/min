module('elasticlunr.DocumentStore');

test('adding document tokens to the document store', function () {
  var docStore = new elasticlunr.DocumentStore,
      doc = {title: 'eggs bread'};

  docStore.addDoc(1, doc);
  deepEqual(docStore.getDoc(1), doc);
});

test('create a document store not storing the doc', function () {
  var docStore = new elasticlunr.DocumentStore(false),
      doc = {title: 'eggs bread'};

  docStore.addDoc(1, doc);
  equal(docStore.length, 1);
  equal(docStore.isDocStored(), false);
  equal(docStore.hasDoc(1), true);
});

test('add doc test without storing the doc', function () {
  var docStore = new elasticlunr.DocumentStore(false),
      doc1 = {title: 'eggs bread'},
      doc2 = {title: 'hello world'};

  docStore.addDoc(1, doc1);
  docStore.addDoc(2, doc2);
  equal(docStore.length, 2);
  equal(docStore.isDocStored(), false);
  equal(docStore.hasDoc(1), true);
  equal(docStore.hasDoc(2), true);
});

test('test isDocStored() function when created DocumentStore without arguments', function () {
  var docStore = new elasticlunr.DocumentStore();
  equal(docStore.isDocStored(), true);
});

test('test isDocStored() function when created DocumentStore with true input', function () {
  var docStore = new elasticlunr.DocumentStore(true);
  equal(docStore.isDocStored(), true);
});

test('test isDocStored() function when created DocumentStore with false input', function () {
  var docStore = new elasticlunr.DocumentStore(false);
  equal(docStore.isDocStored(), false);
});

test('get doc test without storing the doc', function () {
  var docStore = new elasticlunr.DocumentStore(false),
      doc1 = {title: 'eggs bread'},
      doc2 = {title: 'hello world'};

  docStore.addDoc(1, doc1);
  docStore.addDoc(2, doc2);
  equal(docStore.length, 2);
  equal(docStore.isDocStored(), false);
  equal(docStore.getDoc(1), null);
  equal(docStore.getDoc(2), null);
});

test('get non-exist doc test without storing the doc', function () {
  var docStore = new elasticlunr.DocumentStore(false),
      doc1 = {title: 'eggs bread'},
      doc2 = {title: 'hello world'};

  docStore.addDoc(1, doc1);
  docStore.addDoc(2, doc2);
  equal(docStore.length, 2);
  equal(docStore.isDocStored(), false);
  equal(docStore.getDoc(6), null);
  equal(docStore.getDoc(2), null);
});

test('remove doc test without storing the doc', function () {
  var docStore = new elasticlunr.DocumentStore(false),
      doc1 = {title: 'eggs bread'},
      doc2 = {title: 'hello world'};

  docStore.addDoc(1, doc1);
  docStore.addDoc(2, doc2);
  docStore.removeDoc(1);
  equal(docStore.length, 1);
  equal(docStore.isDocStored(), false);
  equal(docStore.getDoc(2), null);
  equal(docStore.getDoc(1), null);
});

test('remove non-exist doc test without storing the doc', function () {
  var docStore = new elasticlunr.DocumentStore(false),
      doc1 = {title: 'eggs bread'},
      doc2 = {title: 'hello world'};

  docStore.addDoc(1, doc1);
  docStore.addDoc(2, doc2);
  docStore.removeDoc(8);
  equal(docStore.length, 2);
  equal(docStore.isDocStored(), false);
  equal(docStore.getDoc(2), null);
  equal(docStore.getDoc(1), null);
});

test('getting the number of docs in the document store', function () {
  var docStore = new elasticlunr.DocumentStore;

  equal(docStore.length, 0);
  docStore.addDoc(1, {title: 'eggs bread'});
  equal(docStore.length, 1);
});

test('get a doc in the document store', function () {
  var docStore = new elasticlunr.DocumentStore;

  equal(docStore.length, 0);
  docStore.addDoc(1, {title: 'eggs bread'});
  deepEqual(docStore.getDoc(1), {title: 'eggs bread'});
});

test('get a doc with multiple fields in the document store', function () {
  var docStore = new elasticlunr.DocumentStore;

  equal(docStore.length, 0);
  docStore.addDoc(1, {title: 'eggs bread'});
  docStore.addDoc(2, {title: 'boo bar'});
  docStore.addDoc(3, {title: 'oracle', body: 'oracle is a great company'});
  deepEqual(docStore.getDoc(3), {title: 'oracle', body: 'oracle is a great company'});
  equal(docStore.length, 3);
});

test('get a non-exist doc in the document store', function () {
  var docStore = new elasticlunr.DocumentStore;

  equal(docStore.length, 0);
  docStore.addDoc(1, {title: 'eggs bread'});
  docStore.addDoc(2, {title: 'boo bar'});
  docStore.addDoc(3, {title: 'oracle', body: 'oracle is a great company'});
  equal(docStore.getDoc(4), null);
  equal(docStore.getDoc(0), null);
  equal(docStore.length, 3);
});

test('checking whether the store contains a key', function () {
  var store = new elasticlunr.DocumentStore;

  ok(!store.hasDoc('foo'));
  store.addDoc('foo', {title: 'eggs bread'});
  ok(store.hasDoc('foo'));
});

test('removing an doc from the store', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  ok(store.hasDoc('foo'));
  equal(store.length, 1);
  store.removeDoc('foo');
  ok(!store.hasDoc('foo'));
  equal(store.length, 0);
});

test('removing a non-exist doc from the store', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  ok(store.hasDoc('foo'));
  equal(store.length, 1);
  store.removeDoc('bar');
  ok(store.hasDoc('foo'));
  equal(store.length, 1);
});

test('test add field length with non-exist docRef', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('bar', 'title', 2);
  deepEqual(store.docInfo, {});
});

test('test add field length with non-exist docRef, non-exist title', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('bar', 'title', 2);
  deepEqual(store.docInfo, {});
});

test('test add field length', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('foo', 'title', 2);
  equal(store.getFieldLength('foo', 'title'), 2);
});

test('test add field length with multiply fields', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('foo', 'title', 2);
  store.addFieldLength('foo', 'body', 10);
  equal(store.getFieldLength('foo', 'title'), 2);
  equal(store.getFieldLength('foo', 'body'), 10);
});

test('test add field length with non-exist field', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('foo', 'body', 10);
  equal(store.getFieldLength('foo', 'body'), 10);
});

test('test delete doc about field length', function () {
  var store = new elasticlunr.DocumentStore;

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('foo', 'title', 2);
  store.addFieldLength('foo', 'body', 10);
  store.removeDoc('foo');
  equal(store.getFieldLength('foo', 'title'), 0);
  equal(store.getFieldLength('foo', 'body'), 0);
});

test('serialising', function () {
  var store = new elasticlunr.DocumentStore;

  deepEqual(store.toJSON(), { docs: {}, docInfo: {}, length: 0, save: true });

  store.addDoc('foo', {title: 'eggs bread'});
  deepEqual(store.toJSON(), { docs: { foo: {title: 'eggs bread'}}, docInfo: {}, length: 1, save: true });
});

test('serialising with docInfo', function () {
  var store = new elasticlunr.DocumentStore;

  deepEqual(store.toJSON(), { docs: {}, docInfo: {}, length: 0, save: true });

  store.addDoc('foo', {title: 'eggs bread'});
  store.addFieldLength('foo', 'title', 2);
  deepEqual(store.toJSON(), { docs: { foo: {title: 'eggs bread'}}, docInfo: {foo: {title: 2}}, length: 1, save: true });

  store.addFieldLength('foo', 'body', 20);
  deepEqual(store.toJSON(), { docs: { foo: {title: 'eggs bread'}}, docInfo: {foo: {title: 2, body: 20}}, length: 1, save: true });
});

test('serialising without storing', function () {
  var store = new elasticlunr.DocumentStore(false);

  deepEqual(store.toJSON(), { docs: {}, docInfo: {}, length: 0, save: false });

  store.addDoc('foo', {title: 'eggs bread'});
  deepEqual(store.toJSON(), { docs: { foo: null }, docInfo: {}, length: 1, save: false });
  
  store.addDoc('bar', {title: 'bar bread'});
  deepEqual(store.toJSON(), { docs: { foo: null, bar: null }, docInfo: {}, length: 2, save: false });
});

test('loading serialised data', function () {
  var serialisedData = {
    length: 1,
    docs: {
      1: {title: 'eggs bread'}
    },
    docInfo: {
      1: {title: 2, body: 20}
    },
    save: true
  };

  var store = elasticlunr.DocumentStore.load(serialisedData);

  equal(store.length, 1);
  equal(store.isDocStored(), true);
  equal(store.getFieldLength(1, 'title'), 2);
  equal(store.getFieldLength(1, 'body'), 20);
  deepEqual(store.getDoc(1), {title: 'eggs bread'});
});

test('loading serialised data with docInfo', function () {
  var serialisedData = {
    length: 1,
    docs: {
      1: {title: 'eggs bread'}
    },
    docInfo: {},
    save: true
  };

  var store = elasticlunr.DocumentStore.load(serialisedData);

  equal(store.length, 1);
  equal(store.isDocStored(), true);
  deepEqual(store.getDoc(1), {title: 'eggs bread'});
});

test('loading serialised data without storing documents', function () {
  var serialisedData = {
    length: 2,
    docs: {
      1: null,
      2: null
    },
    docInfo: {},
    save: false
  };

  var store = elasticlunr.DocumentStore.load(serialisedData);

  equal(store.length, 2);
  equal(store.isDocStored(), false);
  equal(store.hasDoc(1), true);
  equal(store.hasDoc(2), true);
  deepEqual(store.getDoc(1), null);
  deepEqual(store.getDoc(2), null);
});
