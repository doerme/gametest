# 小学十二册离线汉字数据

`curriculum.json` 收录统编语文一至六年级上下册写字表，册内保留教材顺序。
一年级上册保留原有2024年8月第一版100字；其余十一册按人教社电子教材快照
逐册核对。每条记录包含年级、学期、审定版次、字数、来源、字表SHA-256，
新增十一册另含教材PDF的SHA-256和写字表在PDF中的页码（从1计数，含封面）。
电子教材公开入口：https://www.pep.com.cn/ ，存档来源链接见各册 `source`。

| 年级 | 审定版次（上／下） | 会写字（上／下） |
| --- | --- | --- |
| 一年级 | 2024年第一版／2016年审定 | 100／200 |
| 二年级 | 2017年审定 | 250／250 |
| 三年级 | 2018年审定 | 250／250 |
| 四年级 | 2019年审定 | 250／250 |
| 五年级 | 2019年审定 | 220／180 |
| 六年级 | 2019年审定 | 180／120 |

各册固定上述版次及对应电子教材快照。十二册合计2500个字条、去重后2467字。
每册按笔画数量排序并均分为六组，同笔画数保留教材顺序。每关22字，组内超过
22字时随机抽取；不足时先完整练习该组再随机复习。

`data.json` 是 npm `hanzi-writer-data@2.0.1` 的2467字子集，仅保留 `strokes`
和 `medians`，跨册复用同一份笔画。`default-data.json` 是默认100字的主包子集。
浏览器整包内置完整数据；微信构建时生成六个按年级划分的普通分包，选择后通过
`wx.loadSubpackage` 加载并注册笔画。游戏不调用第三方字库接口。

原始图形和中线未经改写。中线与图形均使用上游1024坐标系，显示和识别时统一转换
为 `x / 1024, (900 - y) / 1024`，不对单笔独立缩放或平移。运行时不依赖
Hanzi Writer 的 DOM/SVG。怪物徽标按需写入1024×1024分页图集，切换关卡时释放。

上游：https://github.com/chanind/hanzi-writer-data ，来源 Make Me a Hanzi。
图形版权为 Copyright (C) 1999 Arphic Technology Co., Ltd.，许可证全文见
`ARPHICPL.TXT`。构建时复制到浏览器、微信主包及各年级分包。

重建笔画子集：

```bash
curl -fL https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz -o /tmp/hanzi-writer-data-2.0.1.tgz
python3 scripts/import-hanzi-data.py /tmp/hanzi-writer-data-2.0.1.tgz
npm run build
```

导入脚本校验归档SHA-256、上游版本、十二册完整性、字表SHA-256、册内唯一性及
所有笔画／中线数据。归档SHA-256：
`72baf3d82b114e60d6e40ea05f24d2262a05cd39d544e2f322ba2fceb7beff15`。

核对教材：将各册 `source` 指向的PDF以原文件名存入同一目录，安装 `pypdf`，运行：

```bash
python3 scripts/check-hanzi-textbooks.py /path/to/textbook-pdfs
```

此检查验证十一份PDF的SHA-256及写字表逐字顺序。教材PDF作为核对材料使用，
不随游戏分发。原有一年级上册字表核对来源：https://www.ciyu6.com/yinianji-1 。

接口：`Curricula` 提供 `CURRICULA / DEFAULT_CURRICULUM_ID / getCurriculum(id)`；
`Characters` 提供 `getLevelCharacters(curriculumId)` 和
`createCharacterSequence(level, count, random, curriculumId)`。原有 `CHARACTERS`
和 `LEVEL_CHARACTERS` 继续表示默认书册；`ALL_CHARACTERS` 是十二册去重字表。
浏览器与微信均使用同一份课程目录、排序和抽样规则。
