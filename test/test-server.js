'use strict';
var http = require('http');
var Logger = require('bunyan');

var log = new Logger({
    name: 'test-server',
    level: 'debug'
});

var server = http.createServer(function (request, response) {
    var data = '';

    log.info({ url: request.url }, 'Incoming Request');

    request.on('data', function (chunk) {
        data += chunk;
    });

    response.writeHead(501, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'not implemented' }));
});

var port = 3000;
server.listen(port);
log.info({
    port: port
}, 'listening');

