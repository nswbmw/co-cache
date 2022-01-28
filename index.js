const IORedis = require('ioredis')
const debug = require('debug')('co-cache')

/**
 * Cache function result
 *
 * @param {Object} defaultConfig
 * @return {Function}
 * @api public
 */

module.exports = function (defaultConfig = {}) {
  if (typeof defaultConfig !== 'object') {
    throw new Error('`defaultConfig` must be object!')
  }
  return function coCache (fn, options = {}) {
    if (typeof options !== 'object') {
      options = { expire: options }
    }
    options = Object.assign({}, defaultConfig, options)

    const redis = options.client || new IORedis(options.redisOpt)
    const prefix = typeof options.prefix === 'string' ? options.prefix : ''
    const expire = options.expire || 10000
    const key = options.key || fn.name
    const getter = options.get || defaultGet
    const setter = options.set || defaultSet

    if (!key || !((typeof key === 'string') || (typeof key === 'function'))) {
      throw new Error('`key` must be string or function!')
    }

    async function cache () {
      const args = [].slice.call(arguments)
      const _key = (typeof key === 'string') ? key : (await key.apply(fn, args))

      if (_key === false) {
        return fn.apply(this, args)
      }

      const cacheKey = prefix + _key
      let result = await getter(redis, cacheKey)
      debug('get %s -> %j', cacheKey, result)

      if (result !== undefined) {
        return result
      }

      result = await fn.apply(this, args)

      await setter(redis, cacheKey, result, expire)
      debug('set %s -> %j', cacheKey, result)

      return result
    }

    async function clear () {
      const args = [].slice.call(arguments)
      const _key = (typeof key === 'string') ? key : (await key.apply(fn, args))

      if (_key === false) {
        return
      }

      const cacheKey = prefix + _key
      let result = await redis.del(cacheKey)
      debug('clear %s -> %j', cacheKey, result)

      return result
    }

    cache.clear = clear

    return cache
  }
}

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
