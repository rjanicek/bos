/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var core = require('./bos-core');

function help() {
	console.log('usage: bos <command>');
	console.log('');
	console.log('  compact        bos compact <path/store-name>');
	console.log('                 Compacts the store by merging log file into main data file.');
	console.log('                 This command may be used while an instance of bos is using the');
	console.log('                 data store.');
	console.log('');
	console.log('  unlock         bos unlock <path/store-name>');
	console.log('                 Removes all file locks on data store.');

	process.exit(0);
}

function parseArgv() {
	var argv = process.argv;

	argv.length < 3 && help();

	var args = {
		path: argv.pop(),
		command: argv.pop().toLowerCase()
	};

	return args;
}

function dispatch(args) {
	switch (args.command) {
		case 'compact': 
			console.log('compacting', args.path);
			core.compact(args.path, function (error, data) {
				if (error)  {
					console.error(error);
					return;
				}

				console.log('finished compacting', args.path);
			});
			break;

		case 'unlock':
			core.unlock(args.path, function (error) {
				error && console.error(error);
			});
			break;

		default: help();
	}
}

dispatch(parseArgv());