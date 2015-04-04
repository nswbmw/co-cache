## co-cache

Cache GeneratorFunction result, only support `function`, `string`, `number` and `boolean` as parameters.

### Install

```
npm i co-cache --save
```

### Usage

```
cache(GeneratorFunction, ms)
```

### Example

```
var cache = require('co-cache');

var getTopicsByTab = cache(function* getTopicsByTab(tab, p) {
  var query = {};
  if (tab) { query.tab = tab; }
  p = p || 1;
  return yield Topic.find(query).skip((p - 1) * 10).limit(10).exec();
}, 10000);

co(function* () {
  var topics = yield getTopicsByTab('question', 2);
  ...
}).catch(onerror);
```

**Note:** You must specify a name to `GeneratorFunction` for cache key.

### License

MIT