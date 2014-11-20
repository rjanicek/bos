/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var async = require('async');
var core = require('./bos-core');
var events = require('events');
var execFile = require('child_process').execFile;
var fs = require('fs');
var jsonpatch = require('fast-json-patch');
var lockFile = require('lockfile');
var path = require('path');

var DATA_FILE_EXTENSION = core.DATA_FILE_EXTENSION;
var DATA_LOG_FILE_EXTENSION = core.DATA_LOG_FILE_EXTENSION;
var LOCK_FILE_EXTENSION = core.LOCK_FILE_EXTENSION;

var AUTO_COMPACT_INTERVAL_MS = 1000 * 60 * 60;	// 1 hour

var PATCH_DELIMETER = '\n';

function loadOrCreateData(storePath, options, returnErrorAndData) {
	var fileName = storePath + DATA_FILE_EXTENSION;
	fs.exists(fileName, function (exists) {
		if (!exists) {
			fs.writeFile(fileName, core.stringify(options.defaultObject), function (error) {
				if (error) {
					returnErrorAndData(error);
					return;
				}
				core.load(storePath, returnErrorAndData);
				return;
			});
			return;
		}
		core.load(storePath, returnErrorAndData);
	});
}

function update(storePath, patches, store) {
	var patchFileName = storePath + DATA_LOG_FILE_EXTENSION;
	fs.appendFile(patchFileName, core.stringifyPatches(patches) + PATCH_DELIMETER, function (error) {
		if (error) {
			error.stacktrace = new Error().stack;
			store.emit('error', error);
			return;
		}
		store.emit('data', patches);
	});
}

function compactTrigger(storePath, returnErrorAndShouldCompact) {
	async.auto({
		getDataFileStats: function (done) {
			fs.stat(storePath + DATA_FILE_EXTENSION, done);
		},
		existsLogFile: function (done) {
			fs.exists(storePath + DATA_LOG_FILE_EXTENSION, function (exists) {
				done(undefined, exists);
			});
		},
		getLogFileStats: ['existsLogFile', function (done, results) {
			if (!results.existsLogFile) {
				done();
				return;
			}
			fs.stat(storePath + DATA_LOG_FILE_EXTENSION, done);
		}]
	}, function (error, results) {
		if (error) {
			returnErrorAndShouldCompact(error);
			return;
		}
		if (!results.existsLogFile) {
			returnErrorAndShouldCompact(undefined, false);
			return;
		}
		returnErrorAndShouldCompact(undefined, results.getLogFileStats.size > results.getDataFileStats.size);
	});
}

function scheduleCompact(storePath, store) {
	compactTrigger(storePath, function (error, shouldCompact) {
		if (error) {
			error.stacktrace = new Error().stack;
			store.emit('error', error);
		}
		if (shouldCompact) {
			store.compact(function (error) {
				if (error) {
					error.stacktrace = new Error().stack;
					store.emit('error', error);
				}
				setTimeout(scheduleCompact.bind(undefined, storePath, store), AUTO_COMPACT_INTERVAL_MS);
			});
			return;
		}
		setTimeout(scheduleCompact.bind(undefined, storePath, store), AUTO_COMPACT_INTERVAL_MS);
	});
}

function initializeStore(storePath, store, options, returnErrorAndStore) {
	loadOrCreateData(storePath, options, function (error, data) {
		if (error) {
			error.stacktrace = new Error().stack;
			store.emit('error', error);
			returnErrorAndStore && returnErrorAndStore(error);
			return;
		}

		store.data = data;

		var observer = jsonpatch.observe(data, function (patches) {
			update(storePath, patches, store);
		});

		store.close = function close(returnError) {
			jsonpatch.unobserve(store.data, observer);

			lockFile.unlock(storePath + LOCK_FILE_EXTENSION, function (error) {
				if (error) {
					error.stacktrace = new Error().stack;
					store.emit('error', error);
					if (returnError) { returnError(error); } else { throw error; }
					return;
				}

				store.emit('closed');

				returnError && returnError();
			});
		};

		var isCompacting = false;
		store.compact = function compact(returnError) {
			if (isCompacting) {
				return;
			}
			isCompacting = true;
			execFile('node', [path.join(__dirname, 'bos-cli.js'), 'compact', storePath], function (error, stdout, stderr) {
				isCompacting = false;
				if (error || stderr) {
					error.stacktrace = new Error().stack;
					store.emit('error', error || stderr);
					returnError && returnError(error || stderr);
					return;
				}
				store.emit('compacted');
				returnError();
			});
		};

		options.autoCompact && scheduleCompact(storePath, store);

		store.emit('ready');

		returnErrorAndStore && returnErrorAndStore(undefined, store);
	});	
}

module.exports = function (storePath, options, returnErrorAndStore) {
	if (typeof options === 'function') {
		returnErrorAndStore = options;
		options = {};
	}

	options.defaultObject = options.defaultObject || {};
	options.autoCompact = typeof options.autoCompact === 'undefined' ? true : options.autoCompact;

	var store = new events.EventEmitter();

	lockFile.lock(storePath + LOCK_FILE_EXTENSION, function (error) {
		if (error) {
			if (error.code === 'EEXIST') {
				error.description = 'Could not open data store because files are locked by another instance. If no other instance, manually delete ' + error.path;
			}
			error.stacktrace = new Error().stack;
			store.emit('error', error);
			returnErrorAndStore && returnErrorAndStore(error);
			return;
		}

		initializeStore(storePath, store, options, returnErrorAndStore);
	});

	return store;
};

module.exports.unlock = core.unlock;