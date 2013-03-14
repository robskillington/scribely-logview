var scribely = require('scribely');
var _ = require('underscore')._;
var fs = require('fs');

// Comment this call out if you don't want a text file output as well as console output
forwardOutputToFileLogs();

var app = {
    MIN_TICKS: 621355968000000000,

    out: {
        line: function (line) {
            console.log(line);
        },

        log: function (message) {
            this.line('[log] ' + message);
        },

        error: function (message) {
            this.log('[error] ' + message);
        }
    }
};

var port = 1463;

var consumer = new scribely.Consumer(function (packet) {
    try {
        _.each(packet, function (entry) {
            var log = JSON.parse(entry.message);

            var pretty = '';

            if (log.LogTag) {
                pretty += log.LogTag;
            }

            pretty += "\n";

            var at = parseInt((log.UtcCreated - app.MIN_TICKS) / 10000);

            pretty += new Date(at).toLocaleString() + "\n";

            pretty += 'Host: "' + log.LogHost + '"' + "\n"; 
            pretty += 'From: "' + log.LogFrom + '"';

            app.out.log(pretty);
            app.out.line(log.LogContent);
            app.out.line('');
        });
    } catch (err) {
        app.out.error('Could not parse packet');
        app.out.line(packet);
    }
}).listen(port);

app.out.line('');
app.out.line('scribely-logviewer: listening');
app.out.line('');

function forwardOutputToFileLogs() {
    // Also log to file
    var stdoutFile = 'log.txt';
    var stderrFile = 'error.txt';

    //create a new stdout file stream
    var stdoutFS = fs.createWriteStream(stdoutFile, {
        encoding: 'utf8',
        flags   : 'a+'
    });

    //create a new stderr file stream
    var stderrFS = fs.createWriteStream(stderrFile, {
        encoding: 'utf8',
        flags   : 'a+'
    });

    var hookWriteStream = function (stream, callback) {
        var oldWrite = stream.write;

        stream.write = (function(write) {
            return function(string, encoding, fd) {
                write.apply(stream, arguments);
                callback(string, encoding, fd);
            };
        })(stream.write);

        return function() {
            stream.write = oldWrite;
        };
    };

    var unhookStdout = hookWriteStream(process.stdout, function(string, encoding, fd) {
        stdoutFS.write(string, encoding || 'utf8');
    });

    console.log('Prepared new stdout hook to worker file');

    var unhookStderr = hookWriteStream(process.stderr, function(string, encoding, fd) {
        stderrFS.write(string, encoding || 'utf8');
    });

    console.log('Prepared new stderr hook to worker file');

    stdoutFS.once('close', function() {
        unhookStdout();
        console.log('Unhooked stdout.');
    });

    stdoutFS.once('error', function(err) {
        unhookStdout();
        console.error('Error: Unhooked stdout due to error %j.', err);
    });

    stderrFS.once('close', function() {
        unhookStderr();
        console.log('Unhooked stderr.');
    });

    stderrFS.once('error', function(err) {
        unhookStderr();
        console.error('Error: Unhooked stderr due to error %j.', err);
    });
}
