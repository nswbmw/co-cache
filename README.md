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
const Mongolass = require('mongolass')
const mongolass = new Mongolass()
mongolass.connect('mongodb://localhost:27017/test')

const cache = require('.')({
  prefix: 'cache:',
  expire: 10 * 60 * 1000 // default expire
})

const User = mongolass.model('UserTest')

;(async function () {
  // create test users
  for (let i = 1; i <= 10; i++) {
    await User.insertOne({ name: i })
  }

  const getUsersByPage = cache(function getUsersByPage (p) {
    return User
      .find()
      .skip((p - 1) * 1)
      .limit(1)
  }, {
    key: function (p) {
      if (p >= 3) {
        return false // only cache 1-2 pages
      }
      return this.name + ':' + p
    }
  })

  await getUsersByPage(1)
  await getUsersByPage(2)
  await getUsersByPage(2)
  await getUsersByPage(3)

  await getUsersByPage.clear(1) // clear cache
  await getUsersByPage.clear(2) // clear cache
  await getUsersByPage.clear(3) // no effect, because there is no cache
  
  // remove test users
  await User.remove()

  process.exit()
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
