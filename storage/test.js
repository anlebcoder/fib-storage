var test = require('test');
var process = require("process");
var db = require("db");
var fs = require("fs");
var pool = require('fib-pool');
var STORAGE = require("./lib/");
var hash = require("hash");
test.setup();
var conn,
	_e,
	k;

function HASH(v) {
	return hash.md5(v).digest().hex();
}

function runTest() {
	it("setup", function() {
		_e.setup();
	});

	it("put", function() {
		var v = new Buffer("abcdabcdabcdabcdabcdabcdabcdabcd");
		var r = _e.put(v, "jpeg", {
			width: 100,
			height: 200
		});
		k = HASH(v);
		assert.equal(r, k);
	});

	it("getInfo", function() {
		var d = _e.getInfo(k);
		assert.equal(d.k, k);
		assert.equal(d.size, 32);
		assert.equal(d.type, "jpeg");
		assert.equal(d.extend, JSON.stringify({
			"width": 100,
			"height": 200
		}));
		assert.ok(d.created);
		assert.ok(d.changed);
	});

	it("getValue", function() {
		var v = _e.getValue(k);
		assert.equal(v.toString(), "abcdabcdabcdabcdabcdabcdabcdabcd");
	});

	it("get", function() {
		var d = _e.get(k);
		assert.equal(d.k, k);
		assert.equal(d.size, 32);
		assert.equal(d.type, "jpeg");
		assert.equal(d.extend, JSON.stringify({
			"width": 100,
			"height": 200
		}));
		assert.ok(d.created);
		assert.ok(d.changed);
		assert.equal(d.v.toString(), "abcdabcdabcdabcdabcdabcdabcdabcd");
	});

	it("remove", function() {
		_e.remove(k);
		var d = _e.getInfo(k);
		assert.equal(d, null);
		d = _e.getValue(k);
		assert.equal(d, null);
	});
}

describe("fib-storage", function() {
	before(function() {
		conn = db.open("sqlite:./storage.db");
		_e = new STORAGE(conn);
	});

	after(function() {
		conn.close();
		fs.unlink("./storage.db");
	});

	runTest();
});

describe("fib-storage pool", function() {
	before(function() {
		_e = new STORAGE(pool(function() {
			return db.open("sqlite:./storage.db")
		}));
	});

	after(function() {
		fs.unlink("./storage.db");
	});

	runTest();
});

process.exit(test.run(console.DEBUG));