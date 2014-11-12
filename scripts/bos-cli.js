/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var path = require('path');
var core = require('./bos-core');

function getPathFromArgs() {
	if (process.argv.length !== 4 || process.argv[2] !== 'compact') {
		console.log('usage: bos compact path/store-name');
		process.exit(0);
	}

	return process.argv[3];
}


var path = getPathFromArgs();

console.log('compacting', path);

core.compact(path, function (error, data) {
	if (error)  {
		console.error(error);
		return;
	}

	console.log('finished compacting', path);
});