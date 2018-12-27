fib-storage
===
支持 文件、图片的存储、上传、过滤器显示



## Install

```bash
$ npm install fib-storage
```



## Usage

- 实例化

    - conn数据库对象方式

        ```
        const FibStorage = require("fib-storage");
        const Db = require("db");
        const conn = Db.open("sqlie:./test.db");
        const fibStorage = new FibStorage(conn);
        ```

    - pool对象方式

        ```
        const FibStorage = require("fib-storage");
        const Pool = require("fib-pool");
        const Db = require("db");

        const fibStorage = new FibStorage(Pool(function() {
            return Db.open("sqlite:./test.db")
        }));
        ```

- 选项参数

    - imgMaxSize: Number,  图片最大上传尺寸 单位byte 默认10mb




## Api

```
fibStorage.fileProc(req); //图片上传、下载（根据请求方式区分，POST为上传，GET为下载）

fibStorage.setup(); //初始化表

fibStorage.put(v, type, extend); //写入数据，返回文件的hash值

fibStorage.get(k); //获取文件

fibStorage.getInfo(k); //只获取文件信息

fibStorage.getValue(k); //只获取文件流数据

fibStorage.remove(k); //删除某行
```



## url2storage

根据url过滤图片 

- 规则

    **/hash value.filter.exten**

    eg. ``` /4adfd9f2c8e6a62efd36a4f2aceb3f57.g50.jpg ```

    ​

- 支持列表（陆续更新）

    1. 原图（quality默认70）
        ```
        /${hash}.jpg
        ```

    2. 拼图 （多个hash以 , 隔开 最多支持4张）

        ```
        /${hash},${hash},${hash},${hash}.jpg
        ```

    3. q 图片质量（默认70）

        ```
        /${hash}.q80.jpg
        ```

    3. t 缩略图

        ```
        /${hash}.t50x50.jpg
        ```

    3. g 高斯模糊

        ```
        /${hash}.g50.jpg
        ```

    4. o 剪切

        ```
        /${hash}.o150x200.jpg
        ```

    5. pr 渐进式（扩展名为jpg时默认

        ```
        /${hash}.pr.jpg
        ```

    7. wb 由下往上画矩形

        ```
        /${hash}.wb200.jpg
        ```
    8. et 按a*b的范围,等比例缩略图

        ```
        /${hash}.et50x50.jpg
        ```

