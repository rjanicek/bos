/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var fs = require('fs');

var JSON_FILE_EXTENSION = '.json';
var JSONPATCH_FILE_EXTENSION = '.log';
var PATCH_DELIMETER = '\n';
var DEFAULT_OBJECT = {};

function stringify(object) {
	return JSON.stringify(object, null, 2);
}

function parse(json) {
	return JSON.parse(json);
}

function load(path, returnErrorAndObject) {
	fs.readFile(path + JSON_FILE_EXTENSION, {encoding: 'utf8'}, function (error, json) {
		if (error) {
			returnErrorAndObject(error);
			return;
		}
		returnErrorAndObject(null, parse(json));
	});
}

function loadOrCreate(path, returnErrorAndObject) {
	var fileName = path + JSON_FILE_EXTENSION;
	fs.exists(fileName, function (exists) {
		if (!exists) {
			fs.writeFile(fileName, stringify(DEFAULT_OBJECT), function (error) {
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

module.exports = function (path, returnErrorAndObject) {
	loadOrCreate(path, returnErrorAndObject);
};