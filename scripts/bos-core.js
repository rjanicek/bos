/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var async = require('async');
var fs = require('fs');
var jsonpatch = require('fast-json-patch');
var jsonStream = require('JSONStream');
var lockFile = require('lockfile');

var DATA_FILE_EXTENSION = '.json';
var DATA_LOG_FILE_EXTENSION = '.log';
var LOCK_FILE_EXTENSION = '.lock';
var MUTEX_FILE_EXTENSION = '.mutex';
var TEMP_FILE_SUFFIX = '~';

var me = module.exports;

function parse(json) {
	return JSON.parse(json);
}

me.stringify = function (object) {
	return JSON.stringify(object, null, 2);
};

me.stringifyPatches = function (patches) {
	return JSON.stringify(patches);
};

function applyPatches(storePath, object, returnErrorAndObject) {
	var patchFileName = storePath + DATA_LOG_FILE_EXTENSION;
	fs.exists(patchFileName, function (exists) {
		if (!exists) {
			returnErrorAndObject(undefined, object);
			return;
		}

		var stream = fs.createReadStream(patchFileName, {encoding: 'utf8'});
	    var parser = jsonStream.parse();
	    stream.pipe(parser);
	    parser.on('root', function (patches) {
			if (!jsonpatch.apply(object, patches)) {
				stream.unpipe();
				returnErrorAndObject('error applying patches ' + me.stringifyPatches(patches));
			}
		});
		stream.on('error', function (error) {
			returnErrorAndObject(error);
		});
		stream.on('end', function () {
			returnErrorAndObject(undefined, object);
		});
	});
}

me.load = function (storePath, returnErrorAndObject) {
	
	var mutexPath = storePath + MUTEX_FILE_EXTENSION;
	
	async.auto({
	    lockMutex: function (done) {
	    	lockFile.lock(mutexPath, function (error) {
				if (error && error.code === 'EEXIST') {
					error.description = 'Could not open data store because files are locked by another instance. If no other instance, manually delete ' + error.path;
				}
				done(error);
	    	});
	    },
	    loadData: ['lockMutex', function (done) {
	    	fs.readFile(storePath + DATA_FILE_EXTENSION, {encoding: 'utf8'}, done);
	    }],
	    applyPatches: ['loadData', function (done, results) {
			applyPatches(storePath, parse(results.loadData), done);
	    }],
	    unlockMutex: ['applyPatches', function (done) {
	    	lockFile.unlock(mutexPath, done);
	    }]
	}, function (error, results) {
		returnErrorAndObject(error, results.applyPatches);
	});
};

me.compact = function (storePath, returnErrorAndObject) {
	
	var mutexPath = storePath + MUTEX_FILE_EXTENSION;
	
	async.auto({
		existsPatches: function (done) {
			fs.exists(storePath + DATA_LOG_FILE_EXTENSION, function (exists) {
				done(undefined, exists);
			});
		},

	    lockMutex: function (done) {
	    	lockFile.lock(mutexPath, function (error) {
				if (error && error.code === 'EEXIST') {
					error.description = 'Could not open data store because files are locked by another instance. If no other instance, manually delete ' + error.path;
				}
				done(error);
	    	});
	    },

	    loadData: ['lockMutex', function (done) {
	    	fs.readFile(storePath + DATA_FILE_EXTENSION, {encoding: 'utf8'}, done);
	    }],

	    parseData: ['loadData', function (done, results) {
	    	done(undefined, parse(results.loadData));
	    }],

	    renamePatches: ['existsPatches', function (done, results) {
	    	if (!results.existsPatches) {
	    		done();
	    		return;
	    	}

	    	var tempStorePath = storePath + TEMP_FILE_SUFFIX;
	    	fs.rename(storePath + DATA_LOG_FILE_EXTENSION, tempStorePath + DATA_LOG_FILE_EXTENSION, function (error) {
	    		if (error) {
	    			done(error);
	    			return;
	    		}
	    		done(undefined, tempStorePath);
	    	});
	    }],

	    applyPatches: ['parseData', 'renamePatches', function (done, results) {
	    	if (!results.existsPatches) {
	    		done(undefined, results.parseData);
	    		return;
	    	}
			applyPatches(results.renamePatches, results.parseData, done);
	    }],

	    // save data to a temp file instead of data file directly to minimize
	    // chance of losing data during write process
	    saveDataTemp: ['applyPatches', function (done, results) {
			var tempFileName = storePath + TEMP_FILE_SUFFIX + DATA_FILE_EXTENSION;
			fs.writeFile(tempFileName, me.stringify(results.applyPatches), done);
	    }],

	    renameDataTemp: ['saveDataTemp', function (done) {
	    	var tempFileName = storePath + TEMP_FILE_SUFFIX + DATA_FILE_EXTENSION;
	    	var dataFileName = storePath + DATA_FILE_EXTENSION;
	    	fs.rename(tempFileName, dataFileName, done);
	    }],

	    deletePatches: ['renameDataTemp', function (done, results) {
	    	if (!results.existsPatches) {
	    		done();
	    		return;
	    	}

	    	fs.unlink(results.renamePatches + DATA_LOG_FILE_EXTENSION, done);
	    }]
	}, function (error, results) {
		lockFile.unlock(mutexPath, function (unlockError) {
			if (unlockError) {
				returnErrorAndObject(unlockError);
				return;
			}
			returnErrorAndObject(error, results.applyPatches);
		});		
	});
};

me.unlock = function (storePath, returnError) {
	async.parallel([
		lockFile.unlock.bind(null, storePath + LOCK_FILE_EXTENSION),
		lockFile.unlock.bind(null, storePath + MUTEX_FILE_EXTENSION)
	], returnError);
};

me.DATA_FILE_EXTENSION = DATA_FILE_EXTENSION;
me.DATA_LOG_FILE_EXTENSION = DATA_LOG_FILE_EXTENSION;
me.LOCK_FILE_EXTENSION = LOCK_FILE_EXTENSION;
me.MUTEX_FILE_EXTENSION = MUTEX_FILE_EXTENSION;
