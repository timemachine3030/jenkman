'use strict';
var http = require('http');
var Logger = require('bunyan');

var log = new Logger({
    name: 'test-server',
    level: 'debug'
});

var server = http.createServer(function (request) {
    var data = '';

    log.info({ url: request.url }, 'Incoming Request');

    request.on('data', function (chunk) {
        data += chunk;
    });

    throw new Error('expected error');
});

var port = 3000;
server.listen(port);
log.info({
    port: port
}, 'listening');

