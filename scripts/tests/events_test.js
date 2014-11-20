/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: false, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var bos = require('../bos');
var core = require('../bos-core');
var fs = require('fs');
var path = require('path');

var dataPath = path.join(__dirname, '../../data');
var filesPath = path.join(dataPath, 'store');

exports.setup = function (test) {
	if (!fs.existsSync(dataPath)) {
		fs.mkdirSync(dataPath);
	} else {
		[core.DATA_FILE_EXTENSION, core.DATA_LOG_FILE_EXTENSION, core.LOCK_FILE_EXTENSION].forEach(function (extension) {
			var fileName = filesPath + extension;
			if (fs.existsSync(fileName)) {
				fs.unlinkSync(fileName);
			}
		});
	}

	test.done();
};

exports.should_get_ready_event = function (test) {

	var store = bos(filesPath, { autoCompact: false });

	store.on('ready', function () {
		store.close();
		test.done();
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	});
};

exports.should_get_data_event = function (test) {

	var store = bos(filesPath, { autoCompact: false });

	store.on('ready', function () {
		store.data.moo = true;
	}).on('data', function () {
		store.close();
		test.done();
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	});
};

exports.should_get_closed_event = function (test) {

	var store = bos(filesPath, { autoCompact: false });

	store.on('ready', function () {
		store.close();
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	}).on('closed', function () {
		test.done();
	});
};
