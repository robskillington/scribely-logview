var _ = require('underscore')._;

var EVENT_ADD = 'add';

var EVENTS = [
    EVENT_ADD
];

var COLLECTOR_KEEP_MAX = 4096;

var collector = (function () {
    var self = {

        init: function () {
            self.logs = [];
            self.listeners = {};

            _.each(EVENTS, function (eventType) {
                self.listeners[eventType] = [];
            });
        },

        add: function (message) {
            // Only keep COLLECTOR_KEEP_MAX backlog
            while (self.logs.length > COLLECTOR_KEEP_MAX) {
                self.logs.shift();
            }

            self.logs.push(message);

            _.each(self.listeners[EVENT_ADD], function (callback) {
                callback(message);
            });
        },

        on: function (eventType, callback) {
            if (typeof eventType != 'string' || !_.contains(EVENTS, eventType)) {
                throw 'bad argument: eventType';
            }

            self.listeners[eventType].push(callback);

            return callback;
        },

        off: function (eventType, callback) {
            self.listeners[eventType] = _.without(self.listeners[eventType], callback);
        },

        getLast: function (n) {
            return self.logs.slice(-1 * n);
        }

    };
    self.init();
    return self;
})();

exports.add = collector.add;
exports.on = collector.on;
exports.off = collector.off;
exports.getLast = collector.getLast;
