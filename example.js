'use strict';

let cache = require('.')({
  expire: 10 * 1000 // default expire
});
let co = require('co');
let MongoClient = require('mongodb').MongoClient;

MongoClient.connect('mongodb://localhost:27017', function (err, client) {
  if (err) {
    console.error(err);
    throw err;
  }

  client.on('close', function (e) {
    console.error(new Date() + ': mongodb connection closed.');
    console.error(e);
    process.exit(1);
  });

  co(function* () {
    let coll = client.db('test').collection('test');
    for (let i = 1; i <= 20; i++) {
      yield coll.insert({ topic: i });
    }

    let getIndex = cache(function getIndex() {
      return client.db('test').collection('test').find().limit(10).toArray();
    });

    let getTopicsByPage = cache(function* getTopicsByPage(p) {
      p = p || 1;
      return yield coll.find().skip((p - 1) * 10).limit(10).toArray();
    }, {
      prefix: 'cache:',
      key: function (p) {
        if (p >= 3) {
          return false; // only cache 1-2 pages
        }
        return this.name + ':' + (p || 1);
      }
    });

    console.log('getIndex().then(getIndex) -> %j', yield getIndex().then(getIndex));

    console.log('getTopicsByPage() -> %j', yield getTopicsByPage());
    console.log('getTopicsByPage(1) -> %j', yield getTopicsByPage(1));
    console.log('getTopicsByPage(2) -> %j', yield getTopicsByPage(2));
    console.log('getTopicsByPage(2) -> %j', yield getTopicsByPage(2));
    console.log('getTopicsByPage(3) -> %j', yield getTopicsByPage(3));
    console.log('getTopicsByPage(3) -> %j', yield getTopicsByPage(3));

    yield coll.remove();
    process.exit(0);
  }).catch(function (e) {
    console.error(e.stack);
  });
});
