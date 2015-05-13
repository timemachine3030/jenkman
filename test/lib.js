var assert = require('chai').assert;
var lib = require('../lib');

'use strict';
describe('findPathsForExecutables',function () {
    it('must find in modules', function () {
        var options = {
            steps: {
                ls: false,
                newman: true
            },
            executables: {}
        };

        lib.findPathsForExecutables(options, function (err, opts) {
            assert.notOk(err);
            assert.notOk(opts.executables.ls);
            assert.ok(opts.executables.newman);
        });

    });

    it('must find in path', function () {
        var options = {
            steps: {
                ls: true
            },
            executables: {}
        };

        lib.findPathsForExecutables(options, function (err, opts) {
            assert.notOk(err);
            assert.ok(opts.executables.ls);
        });

    });

    it('error if missing', function () {
        var options = {
            steps: {
                blarniebe: true
            },
            executables: {}
        };

        lib.findPathsForExecutables(options, function (err, opts) {
            assert.ok(err);
            assert.include(err, 'executable not found');
            assert.notOk(opts.executables.blarniebe);
        });

    });

});
