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

#### bos(`dataStorePath`, `[options]`, `[callback(error, store)]`)
Open or create a data store.
* `dataStorePath` The path and file name without extension where th data store files will be saved. The directory must already exist.
* `options` An optional options object.
    * `defaultObject` The default object used to initialize a new data store. It can be `{}` or `[]` and can contain initial values. The default is `{}`.
    * `autoCompact` A `boolean` that controls whether to automatically compact the data store files. If `true` the data store files will be compacted on start-up and then on hourly interval. Compacting also only occurs if the log file is bigger than the data file. The default is `true`.
* `callback` An optional callback that is called when the data store is ready. It receives a possible error and the data store object.
* returns `store` - The data store object is returned.

-------------------------------------------------------------------------------
#### store.data 
`data` is the object that was created or loaded from disk. It will be observed and changes progressively saved to disk. `data` will be `undefined` until data store is loaded, which is signaled by the `ready` event.

-------------------------------------------------------------------------------
#### store.compact(`[callback(error)]`)
Spawns a new process that applies patches accumulated in the log file to the data file. The optional callback is called when compacting is done and receives a possible error object.

-------------------------------------------------------------------------------
#### store.close(`[callback(error)]`)
Completes pending file writes and cleans up. You should always call this function when done with the data store. The optional callback is called when closing is done and receives a possible error object.

-------------------------------------------------------------------------------
#### events

#####`store.emit(`'ready'`)`
The data store is open and ready for business.

#####`store.emit(`'data'`, patches)`
A change in the `store.data` object triggers this event. The event receives an array of `patches` that contain the changes.

#####`store.emit(`'error'`, error)`
Something went wrong, ohh noo! The event receives the error.

#####`store.emit(`'closed'`)`
The data store was closed.

-------------------------------------------------------------------------------
#### bos.unlock(`dataStorePath`, `callback(error)`)
If your application exists without calling `store.close()`, bos will try to unlock the data store files but in some cases this may not be possible. Use `bos.unlock()` to manually unlock a data store.
* `dataStorePath` Is the path and file name without extension of the data store files to unlock.
* `callback(error)` Called when unlocking the data store files is done and receives possible error info.

-------------------------------------------------------------------------------
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
* Store dates as the number of milliseconds since the Unix epoch (1 January 1970 00:00:00 UTC) `new Date().getTime()` This allows more efficient querying by date / time, no need to parse date strings.
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