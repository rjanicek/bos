/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var events = require('events');
var fs = require('fs');
var jsonpatch = require('fast-json-patch');
var jsonStream = require('JSONStream');

var DATA_FILE_EXTENSION = '.json';
var DATA_LOG_FILE_EXTENSION = '.log';
var PATCH_DELIMETER = '\n';

function stringify(object) {
	return JSON.stringify(object, null, 2);
}

function stringifyPatchs(patches) {
	return JSON.stringify(patches);
}

function parse(json) {
	return JSON.parse(json);
}

function loadPatches(path, object, returnErrorAndObject) {
	var patchFileName = path + DATA_LOG_FILE_EXTENSION;
	fs.exists(patchFileName, function (exists) {
		if (!exists) {
			returnErrorAndObject(null, object);
			return;
		}

		var stream = fs.createReadStream(patchFileName, {encoding: 'utf8'});
	    var parser = jsonStream.parse();
	    stream.pipe(parser);
	    parser.on('root', function (patches) {
			if (!jsonpatch.apply(object, patches)) {
				stream.unpipe();
				returnErrorAndObject('error applying patches ' + stringifyPatchs(patches));
			}
		});
		stream.on('error', function (error) {
			returnErrorAndObject(error);
		});
		stream.on('end', function () {
			returnErrorAndObject(null, object);
		});
	});
}

function load(path, returnErrorAndObject) {
	fs.readFile(path + DATA_FILE_EXTENSION, {encoding: 'utf8'}, function (error, json) {
		if (error) {
			returnErrorAndObject(error);
			return;
		}
		loadPatches(path, parse(json), returnErrorAndObject);
	});
}

function loadOrCreate(path, options, returnErrorAndObject) {
	var fileName = path + DATA_FILE_EXTENSION;
	fs.exists(fileName, function (exists) {
		if (!exists) {
			fs.writeFile(fileName, stringify(options.defaultObject), function (error) {
				if (error) {
					returnErrorAndObject(error);
					return;
				}
				load(path, returnErrorAndObject);
				return;
			});
			return;
		}
		load(path, returnErrorAndObject);
	});
}

function update(path, patches, emitter) {
	var patchFileName = path + DATA_LOG_FILE_EXTENSION;
	fs.appendFile(patchFileName, stringifyPatchs(patches) + PATCH_DELIMETER, function (error) {
		if (error) {
			emitter.emit('error', error);
			return;
		}
		emitter.emit('data', patches);
	});
}

module.exports = function (path, options, returnErrorAndObject) {
	if (typeof options === 'function') {
		returnErrorAndObject = options;
		options = {};
	}

	options.defaultObject = options.defaultObject || {};

	var emitter = new events.EventEmitter();

	loadOrCreate(path, options, function (error, object) {
		if (error) {
			returnErrorAndObject(error);
			return;
		}

		jsonpatch.observe(object, function (patches) {
			update(path, patches, emitter);
		});

		returnErrorAndObject(null, object);
	});

	return emitter;
};

module.exports.DATA_FILE_EXTENSION = DATA_FILE_EXTENSION;
module.exports.DATA_LOG_FILE_EXTENSION = DATA_LOG_FILE_EXTENSION;