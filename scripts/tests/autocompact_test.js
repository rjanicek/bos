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

exports.setup_delete_files = function (test) {
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

exports.setup_create_store_with_log = function (test) {
	test.expect(2);

	var store = bos(filesPath, { autoCompact: false }, function (error, store) {
		error && console.error(error);
		test.ifError(error);
		store.data.cow = 'moo';
	}).on('data', function (patches) {
		fs.exists(filesPath + core.DATA_LOG_FILE_EXTENSION, function (exists) {
			test.ok(exists);
			store.close(test.done);
		});	
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	});
};

exports.should_autocompact_store = function (test) {
	test.expect(1);

	var store = bos(filesPath, { autoCompact: true }, function (error, store) {
		error && console.error(error);
		test.ifError(error);
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	}).on('compacted', function () {
		store.close(test.done);
	});
};

exports.log_should_be_gone_after_compact = function (test) {
	test.expect(1);

	fs.exists(filesPath + core.DATA_LOG_FILE_EXTENSION, function (exists) {
		test.ok(!exists);
		test.done();
	});	
};

exports.compacted_store_should_contain_correct_value = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		error && console.error(error);
		test.ifError(error);
		test.strictEqual(store.data.cow, 'moo');
		store.close(test.done);
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	});
};

exports.autocompact_without_log_should_not_compact = function (test) {
	test.expect(1);

	bos(filesPath, { autoCompact: true }, function (error, store) {
		error && console.error(error);
		test.ifError(error);
		setTimeout(function () {
			store.close(test.done);
		}, 500);
	}).on('error', function (error) {
		error && console.error(error);
		test.ifError(error);
	}).on('compacted', function () {
		test.ok(false, 'should not have compacted!');
	});
};