/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: false, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var bos = require('./bos');
var core = require('./bos-core');
var fs = require('fs');
var path = require('path');

var dataPath = path.join(__dirname, '../data');
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

exports.should_create_new_object_with_default_value = function (test) {
	test.expect(1);

	bos(filesPath, { defaultObject: {cow: 'moo'}, autoCompact: false }, function (error, store) {
		test.ok(!error);
		store.close(test.done);
	});
};

exports.should_load_object_with_default_value = function (test) {
	test.expect(2);

	bos(filesPath, { autoCompact: false }, function (error, store) {
		test.ok(!error);
		test.deepEqual(store.data, {cow: 'moo'});
		store.close(test.done);
	});
};

