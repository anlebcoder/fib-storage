const Storage = require('./storage');
const url2img = require('./url2img');
const hash = require('hash');
const gd = require('gd');

function Hash(v) {
    return hash.md5(v).digest().hex();
}

function getFileBuffer(req) {
    let bf;

    if (req.headers && ["application/octet-stream"].indexOf(req.headers["Content-type"]) !== -1) {
        bf = req.body.readAll();
    } else {
        if (!req.form["file"] || !req.form["file"].fileName) {
            req.response.write({
                error: "file is null"
            });
            return;
        }
        bf = req.form["file"].body.readAll();
        if (req.form["file"].contentTransferEncoding === "base64") bf = encoding.base64Decode(bf);
    }
    return bf;
}

function getFileInfo(bf) {
    try {
        let image = gd.load(bf);
        return {
            type: "image",
            extend: {
                size: bf.length,
                width: image.width,
                height: image.height,
                format: image.format,
            }
        }
    } catch (error) {
        return {
            type: "document",
            extend: {
                size: bf.length,
            }
        }
    }
}

module.exports = function FibStorage(conn, opts) {
    opts = opts || {};
    imgMaxSize = opts.imgMaxSize || 1024 * 1024 * 10; //上传图片尺寸限制 单位byte 默认10mb
    let storage = new Storage(conn);
    storage.setup();

    function fileProc(req) {
        let method = req.method;
        let returnData;
        let addr = req.address;
        if (method === 'GET') {
            if (req.firstHeader('If-Modified-Since')) {
                req.response.status = 304;
                return;
            }

            let params = addr.split('/').pop();
            let extend = params.split('.').pop();
            let imgExtList = ['png', 'jpg', 'jpeg', 'bmg', 'gif'];

            if (imgExtList.indexOf(extend.toLowerCase()) != -1) { //图片
                let bf = url2img(req, params, storage);

                if (bf) {
                    req.response.addHeader('Last-Modified', 'Mon, 26 Nov 2012 00:00:00 GMT');
                    req.response.addHeader('Cache-Control', "max-age=" + 10 * 365 * 24 * 60 * 60);
                    returnData = bf;
                }
            } else { //文档
                var paramsArr = params.split(".");
                var hash = paramsArr.shift();
                let bf = storage.get(hash).v;

                req.response.addHeader('Last-Modified', 'Mon, 26 Nov 2012 00:00:00 GMT');
                req.response.addHeader('Cache-Control', "max-age=" + 10 * 365 * 24 * 60 * 60);
                returnData = bf;
            }
        } else if (method === 'POST') {
            let bf = getFileBuffer(req);
            let fileInfo = getFileInfo(bf);

            if (fileInfo.type == "image") { //图片
                if (fileInfo.extend.size > imgMaxSize) {
                    req.response.statusCode = 400;
                    returnData = JSON.stringify({
                        code: 400,
                        error: "oversize error",
                        msg: `图片大小超出${imgMaxSize / 1024 / 1024}MB限制！`
                    });
                } else {
                    let hash = storage.put(bf, fileInfo.type, fileInfo.extend);

                    returnData = JSON.stringify({
                        hash: `${hash}`,
                        msg: "图片上传成功！"
                    });
                }
            } else { //文档
                let hash = storage.put(bf, fileInfo.type, fileInfo.extend);

                returnData = JSON.stringify({
                    hash: `${hash}`,
                    msg: "文件上传成功！"
                });
            }
            req.response.addHeader({
                "Content-Type": "application/json"
            });

        } else {
            returnData = JSON.stringify({
                msg: "invalid request method"
            });
            req.response.statusCode = 400;

            req.response.addHeader({
                "Content-Type": "application/json"
            });
        }

        req.response.write(returnData);
        req.response.end();
    }

    return {
        fileProc: fileProc,
        put: storage.put,
        get: storage.get,
        getInfo: storage.getInfo,
        getValue: storage.getValue,
        remove: storage.remove,
    };
}