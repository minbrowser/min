module('elasticlunr.Pipeline', {
  setup: function () {
    this.existingRegisteredFunctions = elasticlunr.Pipeline.registeredFunctions;
    elasticlunr.Pipeline.registeredFunctions = {};

    this.existingWarnIfFunctionNotRegistered = elasticlunr.Pipeline.warnIfFunctionNotRegistered;
    elasticlunr.Pipeline.warnIfFunctionNotRegistered = $.noop;
  },
  teardown: function () {
    elasticlunr.Pipeline.registeredFunctions = this.existingRegisteredFunctions;
    elasticlunr.Pipeline.warnIfFunctionNotRegistered = this.existingWarnIfFunctionNotRegistered;
  }
});

test("adding a new item to the pipeline", function () {
  var pipeline = new elasticlunr.Pipeline;
  equal(pipeline._queue.length, 0);

  pipeline.add($.noop);
  equal(pipeline._queue.length, 1);
});

test("adding multiple items to the pipeline in one go", function () {
  var pipeline = new elasticlunr.Pipeline;

  pipeline.add($.noop, $.noop);
  equal(pipeline._queue.length, 2);
});

test("removing an item from the pipeline", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn = $.noop;

  pipeline.add(fn);
  equal(pipeline._queue.length, 1);

  pipeline.remove(fn);
  equal(pipeline._queue.length, 0);
});

test("removing a nonexistent item from the pipeline", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = $.noop,
      fn2 = function () {};

  pipeline.add(fn1);
  equal(pipeline._queue.length, 1);

  pipeline.remove(fn2);
  equal(pipeline._queue.length, 1);
});

test("adding an item to the pipeline before another item", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = $.noop,
      fn2 = function () {};

  pipeline.add(fn1);
  pipeline.before(fn1, fn2);

  deepEqual(pipeline._queue, [fn2, fn1]);
});

test("adding an item to the pipeline before nonexistent item", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = $.noop,
      fn2 = function () {},
      fn3 = function () {};

  pipeline.add(fn1, fn2);

  throws(function () {
    pipeline.before(fn3, fn1);
  });

  deepEqual(pipeline._queue, [fn1, fn2]);
});

test("adding an item to the pipeline after another item", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = $.noop,
      fn2 = function () {},
      fn3 = function () {};

  pipeline.add(fn1, fn2);
  pipeline.after(fn1, fn3);

  deepEqual(pipeline._queue, [fn1, fn3, fn2]);
});

test("adding an item to the pipeline after existent item", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = $.noop,
      fn2 = function () {},
      fn3 = function () {};

  pipeline.add(fn1, fn2);
  pipeline.after(fn2, fn3);

  deepEqual(pipeline._queue, [fn1, fn2, fn3]);
});

test("run calls each member of the pipeline for each input", function () {
  var pipeline = new elasticlunr.Pipeline,
      count1 = 0, count2 = 0,
      fn1 = function (token) { count1++ ; return token },
      fn2 = function (token) { count2++ ; return token };

  pipeline.add(fn1, fn2);
  pipeline.run([1,2,3]);

  equal(count1, 3);
  equal(count2, 3);
});

test("run should pass three inputs to the pipeline fn", function () {
  var pipeline = new elasticlunr.Pipeline,
      input, index, arr,
      fn1 = function () { input = arguments[0], index = arguments[1], arr = arguments[2] };

  pipeline.add(fn1);
  pipeline.run(['a']);

  equal(input, 'a');
  equal(index, 0);
  deepEqual(arr, ['a']);
});

test("run should pass the output of one into the input of the next", function () {
  var pipeline = new elasticlunr.Pipeline,
      output,
      fn1 = function (t1) { return t1.toUpperCase(); },
      fn2 = function (t2) { output = t2 };

  pipeline.add(fn1);
  pipeline.add(fn2);
  pipeline.run(['a']);

  equal(output, 'A');
});

test("run should return the result of running the entire pipeline on each element", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = function (t1) { return t1.toUpperCase(); };

  pipeline.add(fn1);

  deepEqual(pipeline.run(['a']), ['A']);
});

test("run should filter out any undefined values at each stage in the pipeline", function () {
  var pipeline = new elasticlunr.Pipeline,
      fn2Count = 0,
      fn1 = function (t) { if (t < 5) return t; },
      fn2 = function (t) { fn2Count++ ; return t; };

  pipeline.add(fn1, fn2);
  var output = pipeline.run([0,1,2,3,4,5,6,7,8,9]);

  equal(fn2Count, 5);
  equal(output.length, 5);
});

test('toJSON', function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = function () {},
      fn2 = function () {};

  elasticlunr.Pipeline.registerFunction(fn1, 'fn1');
  elasticlunr.Pipeline.registerFunction(fn2, 'fn2');

  pipeline.add(fn1, fn2);

  deepEqual(pipeline.toJSON(), ['fn1', 'fn2']);
});

test('test get empty pipeline', function () {
  var pipeline = new elasticlunr.Pipeline;

  deepEqual(pipeline.get(), []);
});

test('test get pipeline', function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = function () {},
      fn2 = function () {};

  elasticlunr.Pipeline.registerFunction(fn1, 'fn1');
  elasticlunr.Pipeline.registerFunction(fn2, 'fn2');

  pipeline.add(fn1, fn2);

  deepEqual(pipeline.get(), [fn1, fn2]);
});

test('registering a pipeline function', function () {
  var fn1 = function () {};

  equal(Object.keys(elasticlunr.Pipeline.registeredFunctions).length, 0);

  elasticlunr.Pipeline.registerFunction(fn1, 'fn1');

  equal(fn1.label, 'fn1');
  equal(Object.keys(elasticlunr.Pipeline.registeredFunctions).length, 1);
  deepEqual(elasticlunr.Pipeline.registeredFunctions['fn1'], fn1);
});

test('test getRegisteredFunction', function () {
  var pipeline = new elasticlunr.Pipeline,
      fn1 = function () {},
      fn2 = function () {};

  elasticlunr.Pipeline.registerFunction(fn1, 'fn1');
  elasticlunr.Pipeline.registerFunction(fn2, 'fn2');

  equal(elasticlunr.Pipeline.getRegisteredFunction('non-exist'), null);
  equal(elasticlunr.Pipeline.getRegisteredFunction(null), null);
  equal(elasticlunr.Pipeline.getRegisteredFunction(undefined), null);
  deepEqual(elasticlunr.Pipeline.getRegisteredFunction('fn1'), fn1);
  deepEqual(elasticlunr.Pipeline.getRegisteredFunction('fn2'), fn2);
});

test('load', function () {
  var fn1 = function () {},
      fn2 = function () {};

  elasticlunr.Pipeline.registerFunction(fn1, 'fn1');
  elasticlunr.Pipeline.registerFunction(fn2, 'fn2');

  var serialised = ['fn1', 'fn2'];

  var pipeline = elasticlunr.Pipeline.load(serialised);

  equal(pipeline._queue.length, 2);
  deepEqual(pipeline._queue[0], fn1);
  deepEqual(pipeline._queue[1], fn2);
});

test('loading an un-registered pipeline function', function () {
  var serialised = ['fn1'];

  throws(function () {
    elasticlunr.Pipeline.load(serialised);
  });
});

test('resetting the pipeline', function () {
  var fn1 = function () {},
      fn2 = function () {},
      pipeline = new elasticlunr.Pipeline;

  pipeline.add(fn1, fn2);
  deepEqual(pipeline._queue, [fn1, fn2]);

  pipeline.reset();
  deepEqual(pipeline._queue, []);
});
