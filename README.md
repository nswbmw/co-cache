## co-cache

Cache result in redis for GeneratorFunction or function that return a Promise.

### Install

```
npm i co-cache --save
```

### Usage

```
var cache = require('co-cache')(defaultConfig);
cache(fn[, options]) => {GeneratorFunction|function->Promise}
```

defaultConfig {Object}:  
options {Object|Number->expire}:

- client: {Object} redis client of [ioredis](https://github.com/luin/ioredis).
- prefix: {String} prefix for redis cache, default `module.parent.filename + ':'`.
- key: {String|GeneratorFunction|function->Promise} prefix + key == cacheKey, default `function.name`, if return `false`, skip get&set cache.
- expire: {Number->ms} expire in ms.
- get: {Function} function to get cache, default `JSON.parse`.
- set: {Function} function to set cache, default `JSON.stringify`.
- others options see [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options)

**NB:** If both `defaultConfig` and `options` missing, `cache` will not work.

### Example

```
var cache = require('co-cache')();

var getIndex = cache(function getIndex() {
  return client.db('test').collection('test').find().limit(10).toArray();
}, 10000);

var getTopicsByPage = cache(function* getTopicsByPage(p) {
  p = p || 1;
  return yield client.db('test').collection('test').find().skip((p - 1) * 10).limit(10).toArray();
}, {
  prefix: 'cache:',
  key: function (p) { // or function*
    if (p >= 3) {
      return false; // only cache 1-2 pages
    }
    return this.name + ':' + (p || 1);
  },
  expire: 10000
});

co(function* () {
  getIndex().then(function () { ... });
  var topics = yield getTopicsByPage(2);
  ...
}).catch(onerror);
```

or use `defaultConfig`:

```
var cache = require('co-cache')({
  expire: 10 * 1000
});

var getIndex = cache(function getIndex() {
  return client.db('test').collection('test').find().limit(10).toArray();
});

var getTopicsByPage = cache(function* getTopicsByPage(p) {
  p = p || 1;
  return yield client.db('test').collection('test').find().skip((p - 1) * 10).limit(10).toArray();
}, {
  prefix: 'cache:',
  key: function (p) { // or function*
    if (p >= 3) {
      return false; // only cache 1-2 pages
    }
    return this.name + ':' + (p || 1);
  }
});

co(function* () {
  getIndex().then(function () { ... });
  var topics = yield getTopicsByPage(2);
  ...
}).catch(onerror);
```

### Test

```
DEBUG=co-cache node --harmony example
```

### License
MIT