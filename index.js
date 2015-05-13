#!/usr/bin/env node
'use strict';
var argv = require('yargs')
    .usage('Usage: $0 [options] -- <server> <server options>')
    .demand(1)

    // Collection
    .demand('c')
    .alias('c', 'collection')
    .describe('c', 'path to Postman test collection')

    // Environment
    .demand('e')
    .alias('e', 'environment')
    .describe('e', 'path to Postman environment to use')
    
    // Coverage
    .describe('cover', 'generate coverage report with istanbul')
    
    // Verbose
    .alias('v', 'verbose')
    .describe('v', 'extra debugging information')

    // Help
    .help('h')
    .alias('h', 'help')

    .argv;
var async = require('async');
var path = require('path');
var lib = require('./lib');

async.waterfall([
    function parseArguments(done) {
        var collection = argv.collection;

        var options = {
            server: {
                main: argv._[0],
                opts: argv._,
                log: process.cwd() + '/' + path.basename(argv._[0]) + '.log'
            },
            newman: {
                results: {
                    json: process.cwd() + '/' + path.basename(collection, '.json') + '-results.json',
                    xml:  process.cwd() + '/' + path.basename(collection, '.json') + '-results.xml'
                },
                collection: collection,
                environment: argv.environment,
                log: [],
                exitCode: 0
            },
            processes: {
                server: null,
                newman: null,
                bunyan: null
            },
            steps: {
                newman: true,
                bunyan: true,
                istanbul: false
            },
            executables: {},
            coverage: argv.cover,
            verbose: argv.verbose
        };

        if (options.coverage) {
            options.stpes.istanbul = true;
        }

        process.on('exit', function () {
            if (options.processes.server) {
                options.processes.server.kill();
            }
            if (options.processes.newman) {
                options.processes.newman.kill();
            }
        });

        done(null, options);
    }, 
    lib.startApi,
    lib.runtests,
    lib.parseResults,
    lib.emitLogs
    
], function (err, options) {
    if (err) {
        console.error(err);
    }
    if (options.newman) {
        process.exit(options.newman.exitCode);
    }
});
