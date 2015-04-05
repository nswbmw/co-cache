var memoryCache = require('memory-cache');

/**
 * Cache GeneratorFunction result
 * 
 * @param {GeneratorFunction} genFunc
 * @param {Number} ms
 * @return {Any} result
 * @api public
 */

module.exports = function (genFunc, time) {
  if (!time || ('number' !== typeof time)) {
    return genFunc;
  }
  return function* cache() {
    var args =  Array.prototype.slice.call(arguments);
    var cacheKey = genFunc.name + args.map(function (arg) {
      if (!arg) {
        return arg;
      }
      switch (typeof arg) {
      case 'function':
        return arg.name;
      case 'string':
      case 'number':
      case 'boolean':
        return arg.toString();
      default:
        throw new Error('co-cache only support `function`, `string`, `number` and `boolean` as parameters');
      }
    }).join('');

    var result = memoryCache.get(cacheKey);
    if (result) {
      return result;
    }
    result = yield genFunc.apply(this, args);
    memoryCache.put(cacheKey, result, time);
    return result;
  };
};