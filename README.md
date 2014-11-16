bos
===
Big Object Store - loads, watches, and progressively saves *changes* in a JavaScript object to disk. Designed for node.js. Can be used as a simple database.

![bos](./bos-mascot.gif "bos")

advantages
----------
* Efficient asynchronous writes, only object *changes* are progressively saved to disk. As the list of changes grows, it is periodically merged into the main data file. Merging is done in a seperate process so your application can continue to work un-interrupted.
* Simple api, it's just a JavaScript object. Whatever you do to the object is saved to disk asynchronously and automatically. 
* Use your favorite functional libraries to work with the object, Lo-Dash, Underscore.js, Lazy.js.
* The root object can be an object or an array.

limits
------
* The object must fit into memory and be JSON.parse-able.
* If you need to store more data than will fit into memory, you should not use bos.

install
-------
```
npm install --save bos
```

usage
-----
```JavaScript
var bos = require('bos');

bos('data/store', function (error, store) {
    if (error) { throw error; }

    store.data.cow = 'mooo';                    // this will be saved to disk
    store.data.cows = ['angus', 'ayrshire'];    // this will be saved to disk
    store.data.cows.push('holstein');           // this will be saved to disk

    store.close();
}).on('error', function (error) {
    console.error(error);
});

```

api
---

#### bos(`dataStorePath`, `[options]`, `callback`)
* `dataStorePath` String - Path and file name without extension where data store files will be saved.
* `options` Object
    * `defaultObject` Object, default = `{}` - The default object, can be `{}` or `[]` and can contain initial values.
    * `autoCompact` Boolean, default = true - Automatically compact data store files if log is bigger than data on start-up and then on hourly interval.
* `callback` `function (error, store)`
    * `error` error info if error occurred when opening data store
    * `store` Object - the data store
        * ***`data` Object - The object that was created or loaded from disk. It will be observed and changes progressively saved to disk.***
        * `close` `[function (error)]` Complete pending file writes and clean up, should always be called when done with data store.
            * `function (error)` optional callback
                * `error` error info if error occurred during close
        * `compact` '[function (error)]' Spawns a new process that applies patches accumulated in the log file to the data file.
            * `function (error)` optional callback that is called when compacting is done
                * `error` error info if error occurred during compacting
* events
    * 'data' `function (patches, store) {}`
        * `patches` Array - detected changes that were saved
        * `store` Object - the data store
    * 'error' `function (error, store) {}`
        * `error` something went wrong!
        * `store` Object - the data store

#### bos.unlock(`dataStorePath`, `callback`)
If your application exists without calling `close`, bos will try to unlock the data store files but in some cases this may not be possible. Use this function to manually unlock a data store.
* `dataStorePath` String - Path and file name without extension of data store files to unlock.
* `callback` `function (error)`
    * `error` error info if error occurred when unlocking the data store

cli
---
```
usage: bos <command>

  compact        bos compact <path/store-name>
                 Compacts the store by merging log file into main data file.
                 This command may be used while an instance of bos is using the
                 data store.

  unlock         bos unlock <path/store-name>
                 Removes all file locks on data store.
```

files
-----
* `store.json` stringified JSON object
* `store.log` RFC 6901 JSON patches, arrays delimited by `\n`
* `store.lock` signals that files are in use by an instance of bos
* `store.mutex` signals that files are inside a critical section

tips
----
* Store dates as the number of milliseconds since 1 January 1970 00:00:00 UTC `new Date().getTime()` This allows more efficient querying by date / time, no need to parse date strings.
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

* account for failed data write during compacting
    * temp patch file would not get deleted, so maybe check it's existence during next compacting and merge it before the active patch file

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
* provide configurable callback option for auto-compact triggering
* if JSON.parse & JSON.stringify are inefficient / use lots of memory
    * try use streaming to stringify and parse objects
    * Research using just JSON patches to store all data. Patches can be processed atomically so would be easier on memory. jsonpatch.compare({}, data) will generate an array of patches completely describing the object. Is jsonpatch.compare efficient? Can it stream patches instead of buffering them?

similar
-------
* [LokiJS - javascript embeddable / in-memory database](https://github.com/techfort/LokiJS)
* [lowdb - Flat JSON file database for Node](https://github.com/typicode/lowdb)
* [nedb - Embedded datastore for node.js](https://github.com/louischatriot/nedb)