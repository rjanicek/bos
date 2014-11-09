/* jshint 
    browser: true, jquery: true, node: true,
    bitwise: true, camelcase: true, curly: true, eqeqeq: true, es3: true, evil: true, expr: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: single, regexdash: true, strict: true, sub: true, trailing: true, undef: true, unused: vars, white: true
*/

'use strict';

var _ = require('lodash');
var glob = require('glob');
var nodeunit = require('nodeunit');
var reporter = nodeunit.reporters.default;

var pattern = process.argv.length === 3 ? process.argv[2] : '';

glob('scripts/**/*' + pattern + '*_test.js', function (er, files) {

    // There might be a way to do this in the glob pattern, but I couldn't find it.
    files = _.filter(files, function (file) { return file.indexOf('/node_modules/') === -1; });

    reporter.run(files, null, function () {
        process.exit();
    });
});