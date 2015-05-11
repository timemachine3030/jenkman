'use strict';
var fs = require('fs'),
    xml2js = require('xml2js');
 
var parser = new xml2js.Parser();
fs.readFile(__dirname + '/tests.postman_collection-results.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
        var checks = {};
        checks['# of tests'] = parseInt(result.testsuites.$.tests, 10) === 2;
        checks['suite 1 failures'] = parseInt(result.testsuites.testsuite[0].$.failures, 10) === 0;
        checks['suite 2 failures'] = parseInt(result.testsuites.testsuite[1].$.failures, 10) === 1;

        Object.keys(checks).forEach(function (key) {
            console.log('[', checks[key] ? 'pass' : 'fail', ']', key);
        });
    });
});
