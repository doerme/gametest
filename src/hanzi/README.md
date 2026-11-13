# 一年级上册离线汉字数据

`curriculum.json` 固定2024年8月第一版统编语文一年级上册写字表100字的教材顺序。
字表核对来源：https://www.ciyu6.com/yinianji-1 。六关按笔画数量排序后均分，
同笔画数保留教材顺序；每组全部出现后才随机复习。

`data.json` 是 npm `hanzi-writer-data@2.0.1` 的100字子集，仅保留 `strokes` 和
`medians`。不依赖 Hanzi Writer 的 DOM/SVG 运行时，也不在游戏中发起字库网络请求。
原始图形和中线未经改写。中线与图形均使用上游1024坐标系，显示和识别时统一转换
为 `x / 1024, (900 - y) / 1024`，不对单笔独立缩放或平移。

上游：https://github.com/chanind/hanzi-writer-data ，来源 Make Me a Hanzi。
图形版权为 Copyright (C) 1999 Arphic Technology Co., Ltd.，许可证全文见
`ARPHICPL.TXT`。构建时许可证复制至浏览器包和微信包目录。

重建子集：

```bash
curl -fL https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz -o /tmp/hanzi-writer-data-2.0.1.tgz
python3 scripts/import-hanzi-data.py /tmp/hanzi-writer-data-2.0.1.tgz
```

导入脚本校验固定 SHA-256、版本、100字唯一性及笔画/中线完整性。
归档 SHA-256：`72baf3d82b114e60d6e40ea05f24d2262a05cd39d544e2f322ba2fceb7beff15`。
