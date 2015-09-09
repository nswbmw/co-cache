'use strict';

let isGeneratorFn = require('is-generator').fn;
let debug = require('debug')('co-cache');

/**
 * Cache function result
 * 
 * @param {function} fn
 * @param {Number|Object} options
 * @return {Any} result
 * @api public
 */

module.exports = function (fn, options) {
  if (!options) {
    return fn;
  }
  if ('number' === typeof options) {
    options = { expire: options };
  }
  let redis = options.client || new require('ioredis')(options);
  let prefix = options.prefix || module.parent.filename + ':';
  let expire = options.expire || 10000;
  let key = options.key || fn.name;
  if (!key || !(isGeneratorFn(key) || ('string' === typeof key))) {
    throw new Error('`key` must be generatorFunction or string!');
  }

  return function* coCache() {
    let args =  [].slice.call(arguments);
    let cacheKey = prefix + ('string' === typeof key ? key : (yield key.apply(fn, args)));

    let result = yield redis.get(cacheKey);
    if (result) {
      debug('get %s -> %j', cacheKey, result);
      return JSON.parse(result);
    }
    result = yield fn.apply(fn, args);
    yield redis.set(cacheKey, JSON.stringify(result), 'PX', expire);
    debug('set %s -> %j', cacheKey, result);

    return result;
  };
};