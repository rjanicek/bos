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

exports.should_create_new_object_with_default_value = function (test) {
	test.expect(1);

	bos(filesPath, {defaultObject: {cow: 'moo'}}, function (error, store) {
		test.ok(!error);
		store.close(test.done);
	});
};

exports.should_load_object_with_default_value = function (test) {
	test.expect(2);

	bos(filesPath, function (error, store) {
		test.ok(!error);
		test.deepEqual(store.data, {cow: 'moo'});
		store.close(test.done);
	});
};

