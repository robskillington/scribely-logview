var fs = require('fs');

exports.debugging = false;

exports.line = function (line) {
    console.log(line);
};

exports.log = function (message) {
    console.log(message);
};

exports.debug = function (message) {
    if (this.debugging) {
        this.log('[debug] ' + message);
    }
};

exports.error = function (message) {
    this.log('[error] ' + message);
};

exports.forwardToFileLogs = function (stdoutFile, stderrFile) {

    var stdoutFileStream = fs.createWriteStream(stdoutFile, {
        encoding: 'utf8',
        flags: 'a+'
    });

    var stderrFileStream = fs.createWriteStream(stderrFile, {
        encoding: 'utf8',
        flags: 'a+'
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
        stdoutFileStream.write(string, encoding || 'utf8');
    });

    console.log('Prepared new stdout hook to worker file');

    var unhookStderr = hookWriteStream(process.stderr, function(string, encoding, fd) {
        stderrFileStream.write(string, encoding || 'utf8');
    });

    console.log('Prepared new stderr hook to worker file');

    stdoutFileStream.once('close', function() {
        unhookStdout();
        console.log('Unhooked stdout');
    });

    stdoutFileStream.once('error', function(err) {
        unhookStdout();
        console.error('Error: Unhooked stdout due to error %j', err);
    });

    stderrFileStream.once('close', function() {
        unhookStderr();
        console.log('Unhooked stderr');
    });

    stderrFileStream.once('error', function(err) {
        unhookStderr();
        console.error('Error: Unhooked stderr due to error %j', err);
    });

};

