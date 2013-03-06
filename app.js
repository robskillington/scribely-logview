var scribely = require('scribely');
var _ = require('underscore')._;

var app = {
    MIN_TICKS: 621355968000000000,

    out: {
        log: function (message) {
            console.log('[log] ' + message);
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

            pretty += new Date(at).toLocaleString() + ' ';

            app.out.log(pretty);
            console.log(log.LogContent);
            console.log('');
        });
    } catch (err) {
        app.error('Could not parse packet');
        console.log(packet);
    }
}).listen(port);

console.log('');
console.log('scribely-logviewer: listening');
console.log('');
