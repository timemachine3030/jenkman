'use strict';
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');
var util = require('util');
var xmlbuilder = require('xmlbuilder');

module.exports = {};
module.exports.findPathsForExecutables = function findPathsForExecutables(options, done) {
    var err = null;
    var systemPath = process.env.PATH.split(':');
    var search = [
        __dirname,
        process.cwd(),
        path.join(__dirname, '/node_modules/.bin'),
        path.join(process.cwd(), '/node_modules/.bin')
    ];

    var locations = search.concat(systemPath);

    Object.keys(options.steps).forEach(function (ex) {
        if (options.steps[ex]) {
            locations.every(function (l) {
                var loc = path.join(l, ex);
                try {
                    var stats = fs.statSync(loc); // jshint: ignore
                    if (stats.isFile()) {
                        if (options.verbose) {
                            util.log(ex + ' found at: ' + loc);
                        }
                        options.executables[ex] = loc;
                        return false;
                    }
                } catch (e) {
                    return true;
                }
            });

            if (!options.executables[ex]) {
                err = ex + ' executable not found, searched: [' + search.join(', ') + '] and system PATH';
            }
        }
    });

    done(err, options);
};
module.exports.startApi = function startApi(options, done) {
    util.log('Starting API Server, ' + options.server.main);
    var log = fs.createWriteStream(options.server.log);
    options.processes.server = spawn(options.executables.node, options.server.opts, {
        //cwd: path.dirname(options.server.main)
    });
    options.processes.server.stdout.on('data', function (data) {
        var output = {};
        try {
            output = JSON.parse(data);
        } catch (e) {
            util.log('Error parsing JSON');
            console.log(e.stack);
        } finally {
            if (output.msg === 'listening') {
                util.log('... server ready, logging to ' + options.server.log);
                done(null, options);
            }
        }
    });
    options.processes.server.stdout.pipe(log);
    options.processes.server.stderr.pipe(log);
    options.processes.server.on('close', function (code, err) {
        if (code) {
            console.error('server exited with code', code, err || '');
            options.exitCode = code || options.exitCode;
            module.exports.emitServerLog(options, function (e) {
                done(e || err || 'API server failed to init', options);
            });
        } else {
            done(err);
        }
    });
};
module.exports.runtests = function runtests(options, done) {
    util.log('Start Newman to Test Collection: ' + options.newman.collection);
    var newman = options.processes.newman = spawn(options.executables.newman,  [
        '--environment', options.newman.environment,
        '--collection', options.newman.collection,
        '--noColor',
        '--outputFile', options.newman.results.json
    ]);

    newman.stdout.on('data', function (data) {
        options.newman.log.push(data);
    });
    newman.stderr.on('data', function (data) {
        console.error('Newman error: ' + data);
    });

    newman.on('close', function (code) {
        util.log('Tests complete. Exit Code: ' + code);
        options.exitCode = code || options.exitCode;
        done(null, options);
    });
};
module.exports.parseResults = function parseResults(options, done) {
    util.log('Parsing Test Results to: ' + options.newman.results.xml);
    var report = require(options.newman.results.json);
    var xml = xmlbuilder.create('testsuites', {
        name: 'Newman Tests',
        tests: 0,
        failures: 0
    });

    var totalTests = 0;
    var totalFails = 0;

    report.results.forEach(function (suite) {
        var ts = xml.ele('testsuite', {
            name: suite.name,
            id: suite.id,
            time: suite.time,
            tests: 0,
            failures: 0
        });
        var iterations = suite.allTests.length;
        var tests = 0;
        var failures = 0;
        var keys = Object.keys(suite.testPassFailCounts);
        if (keys.length) {
            keys.forEach(function (test) {
                var count = suite.testPassFailCounts[test];
                var data = '';
                tests += count.pass + count.fail;
                failures += count.fail;
                var tc = ts.ele('testcase', {
                    name: test,
                    tests: count.pass + count.fail,
                    failures: count.fail,
                    skipped: 0
                });
                if (count.fail) {
                    data = util.format('%s (failed %d of %d iterations)',
                                       test, count.fail, iterations);
                                       tc.ele('failure', {
                                           type: 'Post-request Test'
                                       }, data);
                }
            });
        } else {
            ts.ele('testcase', {
                name: 'no checks',
                tests: 0,
                failures: 0,
                skipped: 0
            });
        }
        ts.att('tests', tests);
        ts.att('failures', failures);
        totalTests += tests;
        totalFails += failures;
    });
    xml.att('tests', totalTests);
    xml.att('failures', totalFails);
    fs.writeFile(options.newman.results.xml, xml.end({pretty: true}), function (err) {
        util.log('...complete');
        done(err, options);
    });
};
module.exports.emitLogs = function emitLogs(options, done) {
    console.log('');
    console.log('*');
    console.log('* Newman', options.newman.collection);
    console.log('*');
    console.log(Buffer.concat(options.newman.log).toString('utf8'));

    if (options.verbose) {
        module.exports.emitServerLog(options, done);
    } else {
        done(null, options);
    }
};
module.exports.emitServerLog = function emitServerLogs(options, done) {
    console.log('*');
    console.log('* API Server Log');
    console.log('*');
    console.log('');
    var b = spawn(options.executables.bunyan, [
        options.server.log
    ]);
    b.stdout.pipe(process.stdout);
    b.on('close', function () {
        done(null, options);
    });
};
