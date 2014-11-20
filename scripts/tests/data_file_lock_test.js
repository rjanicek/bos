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

exports.setUp = function (done) {
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

	done();
};

exports.opening_same_files_in_second_instance_should_error = function (test) {
	test.expect(3);

	bos(filesPath, { autoCompact: false }, function (error) {
		error && console.error(error);
		test.ifError(error);
		bos(filesPath, { autoCompact: false }, function (error) {
			test.ok(error);
			test.done();
		}).on('error', function (error) {
			test.ok(error);
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
