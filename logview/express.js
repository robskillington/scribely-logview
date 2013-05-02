var lib = function (item) { return require('./../lib/' + item); };

var express = require('express'); 
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var expressLayouts = require('express-ejs-layouts');
var socketio = require('socket.io');
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());
_.str.include('Underscore.string', 'string');

var collector = lib('collector');
var out = lib('out');
var parser = lib('parser');

var BACKLOG_SNIPPET_ONLOAD = 200;

exports.logview = function (port) {

    var app = express();

    // debug only
    if (out.debugging) {
        out.log('debug mode: on');
        app.use(express.errorHandler());
        app.use(express.logger('dev'));
    }

    // all environments
    app.set('port', process.env.PORT || port);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.set('view options', { layout: true });
    app.use(express.favicon());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('zamu3pustufechadrUcreyaspesweyum'));
    app.use(express.session());
    app.use(expressLayouts);
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', routes.index);
    app.get('/users', user.list);

    var server = http.createServer(app);

    var io = socketio.listen(server, { log: out.debugging });

    var setupSocketVars = function (socket, callback) {
        // set default filter
        socket.set('filter', '', function () {
            // set default log level
            socket.set('loglevels', parser.loglevels, function () {
                callback();
            });
        });

        // allow updating of filter
        socket.on('filter', function (packet) {
            if (packet && packet.filter && typeof packet.filter == 'string') {
                socket.set('filter', _.trim(packet.filter));
            }
        });

        // allow updating of log level filter
        socket.on('loglevels', function (packet) {
            if (packet && packet.levels && _.isArray(packet.levels)) {
                socket.set('loglevels', packet.levels);
            }
        });
    };

    var getSocketVars = function (socket, callback) {
        socket.get('filter', function (error, filter) {
            if (!error) {
                socket.get('loglevels', function (error, loglevels) {
                    if (!error) {
                        callback(null, {
                            filter: filter,
                            loglevels: loglevels
                        });
                    } else {
                        callback(error);
                    }
                });
            } else {
                callback(error);
            }
        });
    };

    io.sockets.on('connection', function (socket) {
        // initial variable socket setup
        setupSocketVars(socket, function () { 

            // subscribe to collector log events
            var add = collector.on('add', function (log) {
                getSocketVars(socket, function (error, vars) {
                    // Verify loglevel filter matches
                    if (_.contains(vars.loglevels, log.LogTag)) {

                        // Verify filter string matches
                        if (vars.filter && vars.filter.length > 0) {

                            // Only send down if match on the LogContent.Message field
                            if (log.LogContent && log.LogContent.Message && 
                                log.LogContent.Message.toLowerCase().indexOf(vars.filter.toLowerCase()) != -1)
                            {
                                socket.emit('logadd', log);
                            }

                        } else {
                            // No filter matches send down log
                            socket.emit('logadd', log);
                        }
                    }
                });
            });

            // send down a small snippet of the backlogs
            _.each(collector.getLast(BACKLOG_SNIPPET_ONLOAD), function (log) {
                socket.emit('logadd', log);
            });

            // unsubscribe from collector log events
            socket.on('disconnect', function () {
                collector.off('add', add);
            });
        
        });
    });

    server.listen(app.get('port'), function(){
        out.debug('express server listening on port ' + app.get('port'));
    });

};

