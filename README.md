bos
===
Big Object Saver - loads, watches, and progressively saves *changes* in a JavaScript object to disk. Can be used as a simple in-memory database.

![bos](./bos-mascot.gif "bos")

install
-------
```
npm install --save bos
```

usage
-----
```JavaScript
var bos = require('bos');

bos('data/state', function (error, store) {
    if (error) { throw error; }
    store.data.cow = 'mooo';     // this will be saved to disk
    store.close();
}).on('error', function (error) {
    console.error(error);
});

```

api
---

#### bos(`path`, `[options]`, `callback`)
* `path` String - path and file name without extension where object files will be saved.
* `options` Object
    * `defaultObject` Object, default = `{}` - the default object, can be `{}` or `[]` and can contain initial values
* `callback` `function (error, store)`
    * `error` error info if error occurred when opening data store
    * `store` Object - the data store
        * `data` Object - The object that was created or loaded from disk. It will be observed and mutations progressively saved to disk.
        * `close` `[function (error)]` complete pending file writes and clean up, should always be called when done with data store
            * `function (error)` optional callback
                * `error` error info if error occurred during close
* events
    * 'data' `function (patches, store) {}`
        * `patches` Array - detected changes that were saved
        * `store` Object - the data store
    * 'error' `function (error, store) {}`
        * `error` something went wrong!
        * `store` Object - the data store

files
-----
* `data.json` stringified JSON object
* `data.log` RFC 6901 JSON patches, arrays delimited by `\n`
* `data.lock` signals that files are in use by an instance of bos
* `data.mutex` signals that files are inside a critical section

advantages
----------
* efficient writes, only object *changes* are progressively saved to disk
* simple api, it's just a JavaScript object
* use your favorite functional libraries to work with the object

limits
------
* object must fit into memory and be JSON.parse-able

tips
----
* store dates as the number of milliseconds since 1 January 1970 00:00:00 UTC `new Date().getTime()`
    * this allows more efficient querying by date / time, no need to parse date strings
* use objects with keys to efficieltly find data
```JavaScript
var cows = {
    'angus':  {use: 'beef', origin: 'Scotland'},
    'ayrshire': {use: 'dairy', origin: 'Scotland'},
    'holstein': {use: 'dairy', origin: 'Germany'}
};

var findCowFast = cows['holstein'];
```
* use functional libraries like [LoDash](https://lodash.com/docs) to work with objects
```JavaScript
var _ = require('lodash');

var cows = {
    'angus':  {use: 'beef', origin: 'Scotland'},
    'ayrshire': {use: 'dairy', origin: 'Scotland'},
    'holstein': {use: 'dairy', origin: 'Germany'}
};

_.find(cows, function(cow) {
    return cow.origin === 'Scotland';
});
```

tasks
-----
* add test for compacting
* implement safe file updates during compacting by writing to a temp file, then renaming to actual file name
* implement full compacting algorithim, currently compacting occurs every time during object loading

algorithm
---------
* save object as JSON to file
* save changes to object as JSON patches to separate log file
* loading object
    * try lock files
    * parse JSON into object
    * apply JSON patches from log file to object
    * unlock files
* updating object
    * observe object for changes
    * write changes as JSON patches to log file
* compacting JSON, periodically merge patches into JSON file
    * can be run while object is in use
    * can be run in separate process from main object
    * process
        * try lock files
        * rename JSON patch log file
            * when object changes next, a new log file will be created
        * merge renamed log file into JSON data file
        * save merged JSON data file
        * if save is successful, delete renamed log file
        * unlock files
* loading and compacting are mutually exclusive processes
    * object can not be loaded while being compacted
    * object can not be compacted while being loaded
* use event emitter api for errors

ideas
-----
* use streaming to stringify and parse objects to improve memory footprint
* allow manual control when JSON compacting occurs for predictable performance
* browser support

similar
-------
* [LokiJS - javascript embeddable / in-memory database](https://github.com/techfort/LokiJS)
* [lowdb - Flat JSON file database for Node](https://github.com/typicode/lowdb)
* [nedb - Embedded datastore for node.js](https://github.com/louischatriot/nedb)