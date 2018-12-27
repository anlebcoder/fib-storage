"use strict";
var gd = require("gd");
var util = require("util");
var newImg = new util.LruCache(100, 10 * 60 * 1000);
var alphaValues = require("./alphaValues");

exports.getData = function(img, t, q) {
	return img.getData(t || gd.JPEG, q || 85);
}

exports.loadimg = function(f) {
	return gd.load(f);
}

exports.resampleimg = function(img, w, h) {
	return img.resample(w, h);
}

exports.init = function(data, format) {
	var img;
	try {
		img = gd.load(data);
	} catch (e) {
		return;
	}
	var w = img.width,
		h = img.height;

	if (!format && img.format === gd.GIF)
		return img;

	if (w <= 1440 || h <= 1440)
		return img;

	if (w <= h && w > 1440) {
		h = h * 1440 / w;
		w = 1440;
	} else if (h < w && h > 1440) {
		w = w * 1440 / h;
		h = 1440;
	}
	return img.resample(w, h);
}

exports.resample = function(img, w, h) {
	if (w && w >= img.width || h && h >= img.height)
		return img;

	if (!h)
		h = parseInt(w * img.height / img.width);

	return img.resample(w, h);
}

exports.crop = function(img, x, y, w, s) {
	if (![x, y, w, s].every(function(v) {
			return !isNaN(parseInt(v));
		})) return;

	if (w === 0) return;
	var n;

	if (w >= img.width || w >= img.height) {
		if (img.width > img.height)
			n = 1 / (298.0 / img.width);
		else
			n = 1 / (298.0 / img.height);
	} else {
		if (img.width > img.height)
			n = img.width / 298.0;
		else
			n = img.height / 298.0;
	}

	x = parseInt(n * x);
	y = parseInt(n * y);
	w = parseInt(n * w);
	if (w < s) s = w;
	if (s === 0) return;

	return img.crop(x, y, w, w).resample(s, s);
}

exports.thumbnail = function(img, nWidth, nHeight) {
	var iw = img.width,
		ih = img.height,
		h = 0,
		w = 0,
		l = 0,
		t = 0;

	if (nWidth * ih > nHeight * iw) {
		h = nHeight * iw / nWidth;
		w = iw;
		l = 0;
		t = (ih - h) / 4;
	} else {
		h = ih;
		w = nWidth * ih / nHeight;
		l = (iw - w) / 2;
		t = 0;
	}
	return img.crop(l, t, w, h).resample(nWidth, nHeight);
}

exports.copyalpha = function(img, percent, color) {
	var img2 = img.clone(),
		width = img2.width,
		height = img2.height,
		alpha = gd.create(width, height);

	if (color) {
		color = parseInt("0x" + color);
		alpha.filledRectangle(0, 0, width, height, color);
	}
	img2.copyMerge(alpha, 0, 0, 0, 0, width, height, percent || 20);
	return img2;
}

exports.copybackground = function(img, color) {
	var baseImage = img.clone(),
		width = baseImage.width,
		height = baseImage.height,
		bg = gd.create(width, height);
	bg.filledRectangle(0, 0, width, height, color);
	bg.copy(baseImage, 0, 0, 0, 0, width, height);
	return bg;
};

exports.circle = function(img, cx, cy, r) {
	//直径<=80的图画圆利用模板数组来实现
	if (cx <= 80) return exports.radius(img, [r, r, r, r]);

	function setAlpha(cx, cy, x, y, a, d) {
		var s, l;
		img.setPixel(cx + x, cy + y, img.getPixel(cx + x, cy + y) & 0xffffff | a << 24);

		a = 127 << 24;

		if (!d) {
			s = cx + x + 1;
			l = img.width;
		} else {
			s = 0;
			if (cx = Math.floor(cx)) {
				l = cx + x;
			} else {
				l = cx + x - 1;
			}
		}

		for (var i = s; i < l; i++) {
			img.setPixel(i, cy + y, img.getPixel(i, cy + y) | a);
		}
	}
	r = Math.floor(r);
	var x,
		x1,
		a,
		l = r / 1.414;
	img.alphaBlending = false;
	for (var y = 0; y < l; y++) {
		var x = Math.sqrt(r * r - y * y);
		var x1 = Math.floor(x);
		var a = (1 - (x - x1)) * 127;
		setAlpha(cx - r, r - 1, y, -x1, a);
		setAlpha(cx - r, r - 1, x1, -y, a);

		setAlpha(cx - r, cy - r, x1, y, a);
		setAlpha(cx - r, cy - r, y, x1, a);

		setAlpha(r - 1, cy - r, -y, x1, a, -1);
		setAlpha(r - 1, cy - r, -x1, y, a, -1);

		setAlpha(r - 1, r - 1, -x1, -y, a, -1);
		setAlpha(r - 1, r - 1, -y, -x1, a, -1);
	}
	return img;
}

exports.shadow = function(img, v) {
	var x1 = 0,
		x2 = 0,
		y1 = 0,
		y2 = 0;

	v.forEach(function(n) {
		var x = n[0],
			y = n[1];
		if (x < 0) {
			x1 = Math.max(x1, Math.abs(x));
		} else {
			x2 = Math.max(x2, x);
		}

		if (y < 0) {
			y1 = Math.max(y1, Math.abs(y));
		} else {
			y2 = Math.max(y2, y);
		}
	});

	var w = img.width,
		h = img.height,
		w1 = w + x1 + x2,
		h1 = h + y1 + y2,
		baseimg = gd.create(w1, h1);
	baseimg.alphaBlending = false;
	baseimg.filledRectangle(0, 0, w1, h1, 0x7f00ff00);

	function set_Pixel(x, y, color) {
		for (var i = 0; i < w; i++) {
			for (var j = 0; j < h; j++)
				baseimg.setPixel(i + x, j + y, img.getPixel(i, j) >> 24 << 24 | color);
		}
	}

	baseimg.alphaBlending = true;
	v.forEach(function(n) {
		set_Pixel(x1 + n[0], y1 + n[1], n[2]);
	});

	baseimg.copy(img, x1, y1, 0, 0, w, h);
	return baseimg;
}

exports.radius = function(img, c) {
	var w = img.width - 1,
		h = img.height - 1;
	img.alphaBlending = false;

	function semi_circle(a, d, r) {
		function return_length(r, x) {
			if (r < 5) return 0;
			var h = Math.sqrt(r * r * 2) - r,
				l = Math.floor(Math.sqrt(h * h * 2)) - 1 - x;
			if (l <= 0) return 0;
			return l;
		}

		var x,
			y,
			b,
			l;

		for (var i = 0; i < a.length; i++) {
			b = a[i];
			l = return_length(r, i)
			for (var j = 0; j < b.length + l; j++) {
				switch (d) {
					case 1:
						x = i;
						y = j;
						break;
					case 2:
						x = w - j;
						y = i;
						break;
					case 3:
						x = w - i;
						y = h - j;
						break;
					case 4:
						x = j;
						y = h - i;
						break;
				}
				img.setPixel(x, y, ((j < l) ? 127 : b[j - l]) << 24 | img.getPixel(x, y) & 0xffffff);
			}
		}
	}

	for (var i = 0; i < c.length; i++) {
		var a = alphaValues[c[i] - 1];
		if (false && !a) { // 调试模式可释放，根据传入的参数动态生成所需的alphaValue
			a = alphaValues.getAlphaValue(c[i]);
		}
		if (a) semi_circle(a, i + 1, c[i]);
	}
	return img;
}

exports.createimg = function(k) {
	return newImg.get(k, function() {
		var p = k.split("x");
		if (p.length !== 3) return;

		var w = Number(p[0]),
			h = Number(p[1]),
			c = parseInt("0x" + p[2]);
		if (isNaN(w) || isNaN(h) || isNaN(c) || w <= 0 || h <= 0 || c > 0xffffff || w > 400 || h > 400) return;
		var img = gd.create(w, h);
		img.filledRectangle(0, 0, w, h, c);
		return img;
	});
}

exports.merge = function(srcImgArr, dst, opts) {
    opts = opts || {};
    var bkc = opts.bkc || 0xFCFCFC; // 背景色
    var width = opts.width || 200; // 宽度
    var height = opts.height || width; // 高度
    var format = opts.format || gd.PNG; // 格式

    var bk = gd.create(width, height);

    bk.filledRectangle(0, 0, width, height, bkc);
    var arrLen = srcImgArr.length;

    var img = null;
    var dstX = 0;
    var dstY = 0;
    var srcX = 0;
    var srcY = 0;
    var ewidth = 0;
    var eheight = 0;
    var quality = 100;

    switch (arrLen) {
        case 1:
            img = srcImgArr[0];
            dstX = width * 0.1;
            dstY = height * 0.1;
            ewidth = width * 0.8;
            eheight = height * 0.8;
            img = img.resample(ewidth, eheight);
            bk.copy(img, dstX, dstY, srcX, srcY, ewidth, eheight);
            break;

        case 2:
            srcImgArr.map((img, index) => {
                ewidth = width / 2;
                eheight = height / 2;
                img = img.resample(ewidth, eheight);
                dstX = index * ewidth;
                dstY = eheight * 0.5;
                bk.copy(img, dstX, dstY, srcX, srcY, ewidth, eheight);
            });
            break;

        case 3:
            srcImgArr.map((img, index) => {
                ewidth = width / 2;
                eheight = height / 2;
                img = img.resample(ewidth, ewidth);
                if (!index) { //first
                    dstX = 0.5 * ewidth;
                    dstY = 0;
                } else {
                    dstX = (index - 1) * ewidth;
                    dstY = eheight;
                }
                bk.copy(img, dstX, dstY, srcX, srcY, ewidth, eheight);
            });
            break;

        case 4:
            srcImgArr.map((img, index) => {
                ewidth = width / 2;
                eheight = height / 2;
                img = img.resample(ewidth, ewidth);
                if (!index) {
                    dstX = 0;
                    dstY = 0;
                } else if (index == 1) {
                    dstX = ewidth;
                    dstY = 0;
                } else if (index == 2) {
                    dstX = 0;
                    dstY = eheight;
                } else if (index == 3) {
                    dstX = ewidth;
                    dstY = eheight;
                }

                bk.copy(img, dstX, dstY, srcX, srcY, ewidth, eheight);
            });
            break;
        default:
            srcImgArr.map((img, index) => {
                ewidth = width / 2;
                eheight = height / 2;
                img = img.resample(ewidth, ewidth);
                if (!index) {
                    dstX = 0;
                    dstY = 0;
                } else if (index == 1) {
                    dstX = ewidth;
                    dstY = 0;
                } else if (index == 2) {
                    dstX = 0;
                    dstY = eheight;
                } else if (index == 3) {
                    dstX = ewidth;
                    dstY = eheight;
                }

                bk.copy(img, dstX, dstY, srcX, srcY, ewidth, eheight);
            });
            break;
    }

    bk.save(dst, format, quality);
}

exports.JPEG = gd.JPEG;
exports.GIF = gd.GIF;
exports.PNG = gd.PNG;