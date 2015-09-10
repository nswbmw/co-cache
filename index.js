'use strict';

let isGeneratorFn = require('is-generator').fn;
let debug = require('debug')('co-cache');

/**
 * Cache function result
 * 
 * @param {function} fn
 * @param {Object|Number->expire} options
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
  let isGeneratorFunctionFn = isGeneratorFn(fn);
  let isGeneratorFunctionKey = isGeneratorFn(key);

  if (isGeneratorFunctionFn) {
    if (!key || !(('string' === typeof key) || ('function' === typeof key))) {
      throw new Error('`key` must be string or function or generatorFunction!');
    }
    // GeneratorFunction
    return function* () {
      let args =  [].slice.call(arguments);
      let cacheKey;
      if ('string' === typeof key) {
        cacheKey = prefix + key;
      } else if (isGeneratorFunctionKey) {
        cacheKey = prefix + (yield key.apply(fn, args));
      } else if ('function' === typeof key) {
        cacheKey = prefix + key.apply(fn, args);
      }

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
  } else {
    if (!key || !(('string' === typeof key) || ('function' === typeof key))) {
      throw new Error('`key` must be string or function!');
    }
    // Promise
    return function () {
      let args =  [].slice.call(arguments);
      let cacheKey;
      if ('string' === typeof key) {
        cacheKey = prefix + key;
      } else if ('function' === typeof key) {
        cacheKey = prefix + key.apply(fn, args);
      }

      let _result;
      return redis
        .get(cacheKey)
        .then(function (result) {
          if (result) {
            debug('get %s -> %j', cacheKey, result);
            _result = JSON.parse(result);
          }
        })
        .then(function () {
          if (_result) {
            return;
          }
          return fn.apply(fn, args);
        })
        .then(function (result) {
          if (_result) {
            return;
          }
          _result = result;
          return redis
            .set(cacheKey, JSON.stringify(result), 'PX', expire)
            .then(function () {
              debug('set %s -> %j', cacheKey, result);
            });
        })
        .then(function () {
          return _result;
        });
    };
  }
};