'use strict';

let isGeneratorFn = require('is-generator').fn;
let debug = require('debug')('co-cache');
let merge = require('merge-descriptors');

/**
 * Cache function result
 * 
 * @param {Object} defaultConfig
 * @return {Function}
 * @api public
 */

module.exports = function (defaultConfig) {
  defaultConfig = defaultConfig || {};
  if ('object' !== typeof defaultConfig) {
    throw new Error('`defaultConfig` must be object!');
  }
  return function (fn, options) {
    if (!options) {// if missing, not cache. if {}, use default config
      if (Object.keys(defaultConfig).length) {
        options = {};
      } else {
        return fn;
      }
    }
    if ('number' === typeof options) {
      options = { expire: options };
    } else if ('object' !== typeof options) {
      throw new Error('`options` must be number or object!');
    }
    merge(options, defaultConfig, false);

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
        let _key;
        if ('string' === typeof key) {
          _key = key;
        } else if (isGeneratorFunctionKey) {
          _key = yield key.apply(fn, args);
        } else {
          _key = key.apply(fn, args);
        }

        let cacheKey = prefix + _key;
        let result;
        if (_key !== false) {
          result = yield redis.get(cacheKey);
          if (result) {
            debug('get %s -> %j', cacheKey, result);
            return JSON.parse(result);
          }
        }

        result = yield fn.apply(fn, args);

        if (_key !== false) {
          yield redis.set(cacheKey, JSON.stringify(result), 'PX', expire);
          debug('set %s -> %j', cacheKey, result);
        }

        return result;
      };
    } else {
      if (!key || isGeneratorFunctionKey || !(('string' === typeof key) || ('function' === typeof key))) {
        throw new Error('`key` must be string or function (not generatorFunction)!');
      }
      // Promise
      return function () {
        let args =  [].slice.call(arguments);
        let _key;
        if ('string' === typeof key) {
          _key = key;
        } else {
          _key = key.apply(fn, args);
        }

        let cacheKey = prefix + _key;
        let _result;
        return Promise.resolve()
        .then(function () {
          if (_key === false)  {
            return;
          }
          return redis
            .get(cacheKey)
            .then(function (result) {
              if (result) {
                debug('get %s -> %j', cacheKey, result);
                _result = JSON.parse(result);
              }
            });
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
          if (_key === false)  {
            return;
          }
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
};