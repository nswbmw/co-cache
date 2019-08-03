const Mongolass = require('mongolass')
const mongolass = new Mongolass()
mongolass.connect('mongodb://localhost:27017/test')

const cache = require('.')({
  prefix: 'cache:',
  expire: 10 * 1000 // default expire
})

const User = mongolass.model('User')

;(async function () {
  // create some users
  for (let i = 1; i <= 10; i++) {
    await User.insertOne({ name: i })
  }

  const getUsersByPage = cache(function getUsersByPage(p) {
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
  console.log(await getUsersByPage(3))

  await User.remove()

  process.exit()
})().catch(console.error)
