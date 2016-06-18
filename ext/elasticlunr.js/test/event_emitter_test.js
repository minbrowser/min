module('elasticlunr.EventEmitter');

test('adding an event listener', function () {
  var emitter = new elasticlunr.EventEmitter,
      handler = function () {};

  emitter.addListener('test', handler);

  ok('test' in emitter.events);
  ok(emitter.events.test.indexOf(handler) > -1);
});

test('adding a listener to multiple events', function () {
  var emitter = new elasticlunr.EventEmitter,
      handler = function () {};

  emitter.addListener('foo', 'bar', 'baz', handler);

  ok('foo' in emitter.events);
  ok('bar' in emitter.events);
  ok('baz' in emitter.events);

  ok(emitter.events.foo.indexOf(handler) > -1);
  ok(emitter.events.bar.indexOf(handler) > -1);
  ok(emitter.events.baz.indexOf(handler) > -1);
})

test('removing a single event listener', function () {
  var emitter = new elasticlunr.EventEmitter,
      handler = function () {};

  emitter.addListener('test', handler);

  ok('test' in emitter.events);
  ok(emitter.events.test.indexOf(handler) > -1);

  emitter.removeListener('test', handler);

  ok(!('test' in emitter.events));
});

test('removing a single event listener from many listeners', function () {
  var emitter = new elasticlunr.EventEmitter,
      handler = function () {},
      otherHandler = function () {};

  emitter.addListener('test', handler);
  emitter.addListener('test', otherHandler);

  ok('test' in emitter.events);
  ok(emitter.events.test.indexOf(handler) > -1);

  emitter.removeListener('test', handler);

  ok('test' in emitter.events);
  equal(emitter.events.test.indexOf(handler), -1);
  ok(emitter.events.test.indexOf(otherHandler) > -1);
});

test('removing a non existing listener from an event', function () {
  var emitter = new elasticlunr.EventEmitter,
      handler1 = function () {},
      handler2 = function () {var a2 = 1; console.log(a2);},
      handler3 = function () {var a3 = 1; console.log(a3);};

  emitter.addListener('test', handler1);

  ok('test' in emitter.events);
  ok(emitter.events.test.indexOf(handler1) == 0);
  ok(emitter.events.test.length == 1);
  
  emitter.addListener('test', handler2);
  ok(emitter.events.test.indexOf(handler2) == 1);
  ok(emitter.events.test.length == 2);

  emitter.removeListener('test', handler3);
  ok(emitter.events.test.indexOf(handler3) == -1);
  ok(emitter.events.test.length == 2);

  ok('test' in emitter.events);
  ok(emitter.events.test.indexOf(handler1) == 0);
  ok(emitter.events.test.indexOf(handler2) == 1);
});

test('emitting events', function () {
  var emitter = new elasticlunr.EventEmitter,
      callbackCalled = false,
      callbackArguments = [],
      callback = function () {
        callbackArguments = Array.prototype.slice.call(arguments);
        callbackCalled = true;
      };

  emitter.emit('test', 1, 'a');
  emitter.addListener('test', callback);
  emitter.emit('test', 1, 'a');

  ok(callbackCalled);
  deepEqual(callbackArguments, [1, 'a']);
});
