bos - work in progress
===
Big object saver efficiently saves big JavaScript objects to disk. Can be used as an in-memory database.

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
var status = bos('state', function (error, state) {
    if (error) { throw error; }
    state.cow = 'mooo';
});

status.on('error', function (error) {
    console.error(error);
});

```

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