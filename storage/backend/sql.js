module.exports = {
	setup: function(conn) {
		var _sql = 'CREATE TABLE IF NOT EXISTS `fib_storage` (`k` VARCHAR(128) PRIMARY KEY, `v` MEDIUMBLOB, size INTEGER, type VARCHAR(16), `extend` VARCHAR(256), created datetime, changed datetime);';
		conn.execute(_sql);
	},
	put: function(conn, d) {
		var k = d.k,
			v = d.v,
			size = d.size,
			type = d.type,
			extend = JSON.stringify(d.extend || {});

		var rs = conn.execute('select k from `fib_storage` where k = ?', k);
		if (rs.length > 0) return k;
		return conn.execute('insert into `fib_storage` (k, v, size, type, extend, created, changed) values(?, ?, ?, ?, ?, ?, ?);', k, v, size, type, extend, new Date(), new Date()).affected === 1 ? k : false;
	},
	get: function(conn, k) {
		var rs = conn.execute('select k, v, size, type, extend, created, changed from `fib_storage` where k = ?;', k);
		return rs.length === 1 ? rs[0] : null;
	},
	getInfo: function(conn, k) {
		var rs = conn.execute('select k, size, type, extend, created, changed from `fib_storage` where k = ?;', k);
		return rs.length === 1 ? rs[0] : null;
	},
	getValue: function(conn, k) {
		var rs = conn.execute('select v from `fib_storage` where k = ?;', k);
		return rs.length === 1 ? rs[0].v : null;
	},
	remove: function(conn, k) {
		conn.execute('DELETE FROM `fib_storage` where k = ?;', k);
		return true;
	}
};