
exports.parse = function (entry) {
    var log = JSON.parse(entry.message);
    log.Created = new Date(log.UtcCreated);
    return log;
};

exports.loglevels = ['verbose','info','warning','error'];
