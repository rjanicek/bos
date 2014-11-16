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

function update(storePath, patches, emitter, store) {
	var patchFileName = storePath + DATA_LOG_FILE_EXTENSION;
	fs.appendFile(patchFileName, core.stringifyPatches(patches) + PATCH_DELIMETER, function (error) {
		if (error) {
			emitter.emit('error', error, store);
			return;
		}
		emitter.emit('data', patches, store);
	});
}

function compactTrigger(storePath, returnErrorAndShouldCompact) {
	async.auto({
		getDataFileStats: function (done) {
			fs.stat(storePath + DATA_FILE_EXTENSION, done);
		},
		getLogFileStats: function (done) {
			fs.stat(storePath + DATA_LOG_FILE_EXTENSION, done);
		}
	}, function (error, results) {
		if (error) {
			returnErrorAndShouldCompact(error);
			return;
		}
		returnErrorAndShouldCompact(undefined, results.getLogFileStats.size > results.getDataFileStats.size);
	});
}

function scheduleCompact(storePath, store, emitter, interval) {
	compactTrigger(storePath, function (error, shouldCompact) {
		shouldCompact && store.compact(function (error) {
			error && emitter.emit('error', error);
			setTimeout(scheduleCompact.bind(undefined, storePath, store, emitter, AUTO_COMPACT_INTERVAL_MS), interval);
		});
	});
}

function initializeStore(storePath, emitter, options, returnErrorAndStore) {
	loadOrCreateData(storePath, options, function (error, data) {
		if (error) {
			returnErrorAndStore(error);
			return;
		}

		var store = {
			data: data
		};

		var observer = jsonpatch.observe(data, function (patches) {
			update(storePath, patches, emitter, store);
		});

		store.close = function close(returnError) {
			jsonpatch.unobserve(store.data, observer);

			lockFile.unlock(storePath + LOCK_FILE_EXTENSION, function (error) {
				if (error) {
					if (returnError) { returnError(error); } else { throw error; }
					return;
				}
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
				returnError && returnError(error || stderr);
			});
		};

		options.autoCompact && scheduleCompact(storePath, store, emitter, 0);

		returnErrorAndStore(undefined, store);
	});	
}

module.exports = function (storePath, options, returnErrorAndStore) {
	if (typeof options === 'function') {
		returnErrorAndStore = options;
		options = {};
	}

	options.defaultObject = options.defaultObject || {};
	options.autoCompact = typeof options.autoCompact === 'undefined' ? true : options.autoCompact;

	var emitter = new events.EventEmitter();

	lockFile.lock(storePath + LOCK_FILE_EXTENSION, function (error) {
		if (error) {
			if (error.code === 'EEXIST') {
				error.description = 'Could not open data store because files are locked by another instance. If no other instance, manually delete ' + error.path;
			}
			returnErrorAndStore(error);
			return;
		}

		initializeStore(storePath, emitter, options, returnErrorAndStore);
	});

	return emitter;
};

module.exports.unlock = core.unlock;