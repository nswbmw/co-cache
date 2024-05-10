## co-cache

Cache result in redis for AsyncFunction.

### Install

```bash
$ npm i co-cache --save
```

### Usage

```js
const cache = require('co-cache')(defaultConfig);
cache(fn[, options]) => AsyncFunction
```

defaultConfig {Object}:  
options {Object|Number->expire}:

- client: {Object} redis client of [ioredis](https://github.com/luin/ioredis).
- prefix: {String} prefix for redis cache, default `''`.
- key: {String|Function|AsyncFunction} prefix + key == cacheKey, default `fn.name`, if return `false`, skip get&set cache.
- expire: {Number} expire in ms.
- get: {Function|AsyncFunction} function to get cache.
- set: {Function|AsyncFunction} function to set cache.
- redisOpt: {Object} others options see [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options)

### Example

```sh
$ DEBUG=co-cache node example.js
```

```js
process.env.DEBUG = 'co-cache'

const cache = require('.')({
  prefix: 'cache:',
  expire: 10 * 60 * 1000 // default expire
})

;(async function () {
  const someAsyncFn = cache(async function someAsyncFn (number) {
    console.log(`someAsyncFn: ${number}`)
    return number
  }, {
    key: function (number) {
      if (number >= 4) {
        return false // only cache when number < 4
      }
      return this.name + ':' + number
    }
  })

  await someAsyncFn(1)
  await someAsyncFn(2)
  await someAsyncFn(2) // get from cache

  await someAsyncFn.get(3)
  await someAsyncFn.set(3, 'some value') // manually set cache
  await someAsyncFn.get(3) // get from cache

  await someAsyncFn(4) // not cache

  await someAsyncFn.clear(1) // clear cache
  await someAsyncFn.clear(2) // clear cache
  await someAsyncFn.clear(3) // clear cache
  await someAsyncFn.clear(4) // no effect, because there is no cache
})().catch(console.error)
```

### Default get/set

```js
function defaultGet (redis, cacheKey) {
  return redis
    .get(cacheKey)
    .then((result) => {
      if (result != null) {
        return JSON.parse(result)
      }
    })
    .catch(() => {})
}

function defaultSet (redis, cacheKey, result, ms) {
  // cannot save `undefined`` value, `null` is ok
  if (result === undefined) {
    return
  }
  return redis
    .set(cacheKey, JSON.stringify(result), 'PX', ms)
    .catch(() => {})
}
```

### Test

```
$ npm run test
```

### License

MIT
