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
		[filesPath + bos.DATA_FILE_EXTENSION, filesPath + bos.DATA_LOG_FILE_EXTENSION].forEach(function (fileName) {
			if (fs.existsSync(fileName)) {
				fs.unlinkSync(fileName);
			}
		});
	}

	test.done();
};

exports.should_create_new_object = function (test) {
	test.expect(2);

	bos(filesPath, function (error, state) {
		test.ok(!error, error);
		fs.exists(filesPath + bos.DATA_FILE_EXTENSION, function (exists) {
			test.ok(exists);
			test.done();
		});	
	});
	
};

exports.should_load_existing_object = function (test) {
	test.expect(1);

	bos(filesPath, function (error, state) {
		test.ok(!error, error);
		test.done();
	});
};

exports.should_update_object_and_create_log_file = function (test) {
	test.expect(2);

	bos(filesPath, function (error, state) {
		test.ok(!error);
		state.cow = 'moo';
	}).on('data', function (patches) {
		fs.exists(filesPath + bos.DATA_LOG_FILE_EXTENSION, function (exists) {
			test.ok(exists);
			test.done();
		});	
	}).on('error', function (error) {
		test.on(!error);
	});
};

exports.should_load_updated_object = function (test) {
	test.expect(2);

	bos(filesPath, function (error, state) {
		test.ok(!error);
		test.strictEqual(state.cow, 'moo');
		test.done();
	});
};
