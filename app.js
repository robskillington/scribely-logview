var lib = function (item) { return require('./lib/' + item); };

var scribely = require('scribely');
var _ = require('underscore')._;
var express = require('express');

var collector = lib('collector');
var out = lib('out');
var parser = lib('parser');

// Uncomment this call to output flat log files 
//out.forwardToFileLogs('log.txt', 'error.txt');

var port = 1463;
out.debugging = false;

var consumer = new scribely.Consumer(function (packet) {
    try {
        _.each(packet, function (entry) {
            var log = parser.parse(entry);
            collector.add(log);

            var pretty = '';

            if (log.LogTag) {
                pretty += log.LogTag;
            }

            pretty += "\n";

            pretty += log.Created.toLocaleString() + "\n";

            pretty += 'Host: "' + log.LogHost + '"' + "\n"; 
            pretty += 'From: "' + log.LogFrom + '"';

            out.log(pretty);
            out.line(log.LogContent);
            out.line('');
        });
    } catch (err) {
        out.error('Could not parse packet');
        out.line(packet);
    }
}).listen(port);

out.line('');
out.line('scribely-logviewer: listening');
out.line('');

require('./logview/express').logview(9000);

