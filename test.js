const Test = require('test');
const Process = require("process");
const Db = require("db");
const Fs = require("fs");
const Hash = require('hash');
const Gd = require("gd");
const Http = require('http');
const Pool = require('fib-pool');
const FibStorage = require('./index');

Test.setup();

let conn,
    fibStorage,
    imgMaxSize = 20 * 1024,  //20kb
    url = {
        protocol: 'http',
        domain: '127.0.0.1',
        port: 8080,
        get ['host']() {
            return this.protocol + '://' + this.domain + ':' + this.port
        },
    };

describe("image upload & download", function() {
    let hash;

    before(function() {
        fibStorage = new FibStorage(Pool(function() {
            conn = Db.open("sqlite:./storage.db")
            return conn;
        }), {
                imgMaxSize: imgMaxSize
            }
        );
    });

    after(function() {
        conn.close();
        Fs.unlink("./storage.db");
    });

    it('server', () => {
        ++url.port;

        let srv = new Http.Server(url.port, [
            {
                '^/fileProc': fibStorage.fileProc
            },
        ]);
        srv.asyncRun();
    });

    it('upload image', () => {
        let img = Gd.create(300, 300);
        let f = img.getData(Gd.PNG);
        let res = new Http.Client().post(url.host + '/fileProc', {
            headers: {
                "Content-Type": "application/octet-stream",
            },
            body: f
        });

        assert.equal(res.statusCode, 200);
        assert.property(res.json(), "hash");
        hash = res.json().hash;
    });

    it('download image by hash', () => {
        let res = new Http.Client().get(url.host + `/fileProc/${hash}.png`);

        let buffer = res.body.readAll();
        let hashFromBuffer = Hash.md5(buffer).digest().hex();
        assert.equal(res.statusCode, 200);
        assert.equal(hash, hashFromBuffer);
    });

    it('invalid request method', () => {
        let res = new Http.Client().del(url.host + `/fileProc/${hash}.png`);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.json(), {
            "msg": "invalid request method"
        });

        res = new Http.Client().put(url.host + `/fileProc/${hash}.png`, {
            body: {}
        });

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.json(), {
            "msg": "invalid request method"
        });
    });

    it('oversize upload', () => {
        let img = Gd.create(3000, 3000);
        let f = img.getData(Gd.PNG);
        let res = new Http.Client().post(url.host + '/fileProc', {
            headers: {
                "Content-Type": "application/octet-stream",
            },
            body: f
        });

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.json(), {
            code: 400,
            error: "oversize error",
            msg: `图片大小超出${imgMaxSize / 1024 / 1024}MB限制！`
        });
    });

    it('get meerged image by hash array', () => {
        let res = new Http.Client().get(url.host + `/fileProc/${hash},${hash},${hash},${hash}.png`);

        let buffer = res.body.readAll();
        assert.equal(res.statusCode, 200); //无法比较hash
    });
});

describe("file upload & download", function() {
    let hash;

    before(function() {
        fibStorage = new FibStorage(Pool(function() {
            conn = Db.open("sqlite:./storage.db")
            return conn;
        }));
    });

    after(function() {
        conn.close();
        Fs.unlink("./storage.db");
    });

    it('server', () => {
        ++url.port;

        let srv = new Http.Server(url.port, [
            {
                '^/fileProc': fibStorage.fileProc
            },
        ]);
        srv.asyncRun();
    });

    it('upload file', () => {
        let stream = Fs.openFile("README.md");
        file = new Buffer(stream.readAll());
        let res = new Http.Client().post(url.host + '/fileProc', {
            headers: {
                "Content-Type": "application/octet-stream",
            },
            body: file
        });

        assert.equal(res.statusCode, 200);
        assert.property(res.json(), "hash");
        hash = res.json().hash;
    });

    it('download file by hash', () => {
        let res = new Http.Client().get(url.host + `/fileProc/${hash}.md`);

        let buffer = res.body.readAll();
        let hashFromBuffer = Hash.md5(buffer).digest().hex();
        assert.equal(res.statusCode, 200);
        assert.equal(hash, hashFromBuffer);
    });
});

let k;

function HASH(v) {
    return Hash.md5(v).digest().hex();
}

function runTest() {
    it("put", function() {
        let v = new Buffer("abcdabcdabcdabcdabcdabcdabcdabcd");
        let r = fibStorage.put(v, "jpeg", {
            width: 100,
            height: 200
        });
        k = HASH(v);
        assert.equal(r, k);
    });

    it("getInfo", function() {
        let d = fibStorage.getInfo(k);
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
        let v = fibStorage.getValue(k);
        assert.equal(v.toString(), "abcdabcdabcdabcdabcdabcdabcdabcd");
    });

    it("get", function() {
        let d = fibStorage.get(k);
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
        fibStorage.remove(k);
        let d = fibStorage.getInfo(k);
        assert.equal(d, null);
        d = fibStorage.getValue(k);
        assert.equal(d, null);
    });
}

describe("get & put & remove", function() {
    before(function() {
        conn = Db.open("sqlite:./storage.db");
        fibStorage = new FibStorage(conn);
    });

    after(function() {
        conn.close();
        Fs.unlink("./storage.db");
    });

    runTest();
});

describe("get & put & remove by pool", function() {
    before(function() {
        fibStorage = new FibStorage(Pool(function() {
            conn = Db.open("sqlite:./storage.db")
            return conn;
        }));
    });

    after(function() {
        conn.close();
        Fs.unlink("./storage.db");
    });

    runTest();
});

Process.exit(Test.run(console.DEBUG));