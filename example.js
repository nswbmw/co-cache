'use strict';

let cache = require('.');
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
    }, 10000);

    let getTopicsByPage = cache(function* getTopicsByPage(p) {
      p = p || 1;
      return yield coll.find().skip((p - 1) * 10).limit(10).toArray();
    }, {
      prefix: 'cache:',
      key: function* (p) {
        return this.name + ':' + (p || 1);
      },
      expire: 10000
    });

    yield getIndex();
    yield getIndex();

    yield getTopicsByPage();
    yield getTopicsByPage(1);
    yield getTopicsByPage(2);
    yield getTopicsByPage(2);
    yield getTopicsByPage(3);
    yield getTopicsByPage(3);

    yield coll.remove();
  }).catch(function (e) {
    console.error(e.stack);
  });
});
