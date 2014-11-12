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

exports.setUp = function (done) {
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

	done();
};

exports.opening_same_files_in_second_instance_should_error = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, db) {
		test.ok(!error, error);
		bos(filesPath, { autoCompact: false }, function (error) {
			test.ok(error);
			test.done();
		});
	});
};

exports.opening_same_files_in_second_instance_after_first_instances_closes_should_be_ok = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, db) {
		test.ok(!error, error);
		db.close(function (error) {
			bos(filesPath, { autoCompact: false }, function (error, db) {
				test.ok(!error);
				test.done();
			});
		});
	});
};