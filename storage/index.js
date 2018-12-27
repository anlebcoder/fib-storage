var util = require('util');
var utils = require('./utils');
var hash = require('hash');

var backends = {
    SQLite: require('./backend/sql'),
    MySQL: require('./backend/sql')
};

function backend(conn) {
    var t = Object.prototype.toString.call(conn);
    var _back = backends[t.substr(8, t.length - 9)];
    return _back || conn._back || conn;
}

function HASH(v) {
    return hash.md5(v).digest().hex();
}

function STORAGE(conn, opts = {}) {
    if (typeof conn === 'function') {
        var pool_name = utils.pool_name(opts);
        util.extend(this, {
            setup: function() {
                return conn(pool_name, function(c) {
                    return backend(c).setup(c);
                });
            },
            put: function(v, type, extend) {
                var d = {
                    k: HASH(v),
                    v: v,
                    size: v.length,
                    type: type,
                    extend: extend
                };
                return conn(pool_name, function(c) {
                    return backend(c).put(c, d);
                });
            },
            get: function(k) {
                return conn(pool_name, function(c) {
                    return backend(c).get(c, k);
                });
            },
            getInfo: function(k) {
                return conn(pool_name, function(c) {
                    return backend(c).getInfo(c, k);
                });
            },
            getValue: function(k) {
                return conn(pool_name, function(c) {
                    return backend(c).getValue(c, k);
                });
            },
            remove: function(k) {
                return conn(pool_name, function(c) {
                    return backend(c).remove(c, k);
                });
            },
        });
    } else {
        var _back = backend(conn);
        util.extend(this, {
            setup: function() {
                return _back.setup(conn);
            },
            put: function(v, type, extend) {
                var d = {
                    k: HASH(v),
                    v: v,
                    size: v.length,
                    type: type,
                    extend: extend
                };
                return _back.put(conn, d);
            },
            get: function(k) {
                return _back.get(conn, k);
            },
            getInfo: function(k) {
                return _back.getInfo(conn, k);
            },
            getValue: function(k) {
                return _back.getValue(conn, k);
            },
            remove: function(k) {
                return _back.remove(conn, k);
            },
        });
    }
}

module.exports = STORAGE;