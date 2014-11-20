/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: false, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var core = require('../bos-core');
var execFile = require('child_process').execFile;
var fs = require('fs');
var lockFile = require('lockfile');
var path = require('path');

var dataPath = path.join(__dirname, '../../data');
var filesPath = path.join(dataPath, 'store');

exports.setup_delete_files = function (test) {
	if (!fs.existsSync(dataPath)) {
		fs.mkdirSync(dataPath);
	} else {
		[core.DATA_FILE_EXTENSION, core.DATA_LOG_FILE_EXTENSION, core.LOCK_FILE_EXTENSION, core.MUTEX_FILE_EXTENSION].forEach(function (extension) {
			var fileName = filesPath + extension;
			fs.existsSync(fileName) && fs.unlinkSync(fileName);
		});
	}

	test.done();
};

exports.should_unlock_files = function (test) {

	var lockPath = filesPath + core.LOCK_FILE_EXTENSION;
	var mutexPath = filesPath + core.MUTEX_FILE_EXTENSION;

	lockFile.lockSync(lockPath);
	lockFile.lockSync(mutexPath);

	test.ok(fs.existsSync(lockPath));
	test.ok(fs.existsSync(mutexPath));

	execFile('node', ['scripts/bos-cli', 'unlock', filesPath], function (error, stdout, stderr) {
		
		error && console.error(error);
		test.ifError(error);
		stderr && console.error(stderr);
		test.strictEqual(stderr, '');

		test.ok(!fs.existsSync(lockPath));
		test.ok(!fs.existsSync(mutexPath));

		test.done();
	});

	
};
