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
  await someAsyncFn.raw(5) // skip cache

  await someAsyncFn.clear(1) // clear cache
  await someAsyncFn.clear(2) // clear cache
  await someAsyncFn.clear(3) // clear cache
  await someAsyncFn.clear(4) // no effect, because there is no cache
})().catch(console.error)
