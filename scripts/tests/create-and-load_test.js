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

exports.should_create_new_store = function (test) {
	test.expect(3);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		test.ok(!error, error);
		fs.exists(filesPath + core.DATA_FILE_EXTENSION, function (exists) {
			test.ok(exists);
			store.close(function (error) {
				test.ok(!error, error);
				test.done();
			});
		});	
	});
	
};

exports.should_load_existing_object = function (test) {
	test.expect(1);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		test.ok(!error, error);
		if (store) {
			store.close(test.done);
		} else {
			test.done();
		}
	});
};

exports.should_update_object_and_create_log_file = function (test) {
	test.expect(2);

	var store = bos(filesPath, { autoCompact: false }, function (error, store) {
		test.ok(!error, error);
		store.data.cow = 'moo';
	}).on('data', function (patches) {
		fs.exists(filesPath + core.DATA_LOG_FILE_EXTENSION, function (exists) {
			test.ok(exists);
			store.close(test.done);
		});	
	}).on('error', function (error) {
		test.on(!error);
	});
};

exports.should_load_updated_object = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		error && console.error(error);
		test.ifError(error);
		test.strictEqual(store.data.cow, 'moo');
		store.close(test.done);
	});
};
