/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: false, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var bos = require('./index');
var fs = require('fs');
var path = require('path');

var dataPath = path.join(__dirname, '../data');
var filesPath = path.join(dataPath, 'state');

exports.setup = function (test) {
	if (!fs.existsSync(dataPath)) {
		fs.mkdirSync(dataPath);
	} else {
		[bos.DATA_FILE_EXTENSION, bos.DATA_LOG_FILE_EXTENSION, bos.LOCK_FILE_EXTENSION].forEach(function (extension) {
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

	bos(filesPath, function (error, store) {
		test.ok(!error, error);
		fs.exists(filesPath + bos.DATA_FILE_EXTENSION, function (exists) {
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

	bos(filesPath, function (error, store) {
		test.ok(!error, error);
		store.close(test.done);
	});
};

exports.should_update_object_and_create_log_file = function (test) {
	test.expect(2);

	bos(filesPath, function (error, store) {
		test.ok(!error);
		store.data.cow = 'moo';
	}).on('data', function (patches, store) {
		fs.exists(filesPath + bos.DATA_LOG_FILE_EXTENSION, function (exists) {
			test.ok(exists);
			store.close(test.done);
		});	
	}).on('error', function (error) {
		test.on(!error);
	});
};

exports.should_load_updated_object = function (test) {
	test.expect(2);

	bos(filesPath, function (error, store) {
		test.ok(!error);
		test.strictEqual(store.data.cow, 'moo');
		store.close(test.done);
	});
};
