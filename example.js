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
