/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: false, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var bos = require('./bos');
var fs = require('fs');
var path = require('path');

var dataPath = path.join(__dirname, '../data');
var filesPath = path.join(dataPath, 'store');

exports.setup_delete_files = function (test) {
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

exports.setup_create_store_with_log = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		test.ok(!error, error);
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

exports.should_compact_store = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		error && console.error(error);
		test.ifError(error);
		store.compact(function (error) {
			error && console.error(error);
			test.ifError(error);
			store.close(test.done);
		});		
	});
};

exports.log_should_be_gone_after_compact = function (test) {
	test.expect(1);

	fs.exists(filesPath + bos.DATA_LOG_FILE_EXTENSION, function (exists) {
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
	});
};

