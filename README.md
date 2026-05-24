# 符咒学院 MVP

一个原创微信小游戏 MVP：玩家通过触摸画符，帮助不断前进的小法师猫穿过中世纪古堡大厅、深海飞船长廊、极光企鹅酒店与恐龙乐园，消除靠近的怪物。玩法参考“敌人带符号、玩家画符施法”的经典结构，但角色、视觉和命名均为原创。

## 运行

1. 打开微信开发者工具。
2. 选择“小游戏”并导入本目录：`/Users/liangxiaoming/Documents/game`。
3. AppID 可先使用测试号或保留 `touristappid`。
4. 点击编译后，在模拟器中点击开始游戏。
5. 真机预览时，修改代码或贴图后请重新编译并重新生成预览二维码。

## 核心操作

- 每一关开始前选择 `普通难度` 或 `+1 难度`；`+1` 会让本关敌人移动、出怪与场景滚动速度提高 `50%`。
- 右上角 `声音 开 / 声音 关` 可以随时切换背景音乐与消灭音效，首次启动默认为开启。
- 看到 `↑ / ↓ / ← / →` 时，按箭头方向划线；看到 `V / ∧` 时，照形状画。
- 进入第三关后新增 `○` 圆形符咒，沿着圆环绘制即可。
- 进入第四关后新增实战符咒 `Z`，沿三段折线轨迹绘制即可。
- 敌人符号队列清空后消失并加分。
- 一次施法会命中所有“队列首符号”匹配的敌人；多符号敌人需要连续画完队列才会消失。
- 连续有效施法会积累 `COMBO`；消灭怪物时，`Combo x3 / x5 / x10 / x20 / x50 / x100` 起分别获得 `1.2x / 1.5x / 2.0x / 2.5x / 3.0x / 4.0x` 基础消灭分倍率，徽章随档位强化并放大，Miss、掉心或换关会清零。
- 第一关与第二关结束后会进入下一关难度选择页；重新选择后继续闯关，得分和剩余生命会延续。
- 第二关的海洋怪物只展示当前需要绘制的符号，圆点表示尚未揭示的后续符号数量。
- 第三关的企鹅主题敌人沿用隐藏队列机制，长 Boss 队列会显示当前符号和剩余数量。
- 第四关的恐龙主题敌人首次携带 `Z` 符咒，霸王龙 Boss 会混合考察全部符咒。
- 四关 Boss 的符咒数量依次为 `6 / 8 / 10 / 12`，后续关卡出怪更密且移动更快。
- 通关或失败后点击重开会回到第一关难度选择页。
- 敌人碰到主角会扣 1 点生命并触发短震动反馈，生命归零失败。
- 猫猫位置固定在屏幕下方，滚动背景会呈现持续向屏幕上方行走的效果。

## 角色资源

- 主角贴图：`assets/images/cat-walk-sheet.png`，4 帧横向行走精灵图，每帧 `128 x 128`。
- 场景背景：`assets/images/castle-corridor-loop.jpg`，原创斜俯视古堡长廊无缝地图；整张地图与火把光晕会持续向下循环滚动。
- 第二关背景：`assets/images/ocean-spaceship-corridor-loop.jpg`，原创俯视深海飞船酒店风格长廊，以舷窗、水光和蓝青灯带构成滚动场景。
- 第二关怪物：`assets/images/enemy-jellyfish.png`、`assets/images/enemy-pufferfish.png`、`assets/images/enemy-shark.png` 与 `assets/images/boss-megalodon.png`。
- 第三关背景：`assets/images/penguin-hotel-corridor-loop.jpg`，企鹅酒店主题启发的原创极地冰川长廊，以冰蓝材质和极光灯带构成滚动场景。
- 第三关怪物：`assets/images/enemy-penguin-bellhop.png`、`assets/images/enemy-penguin-chef.png` 与 `assets/images/boss-emperor-penguin.png`。
- 第四关背景：`assets/images/dinosaur-park-corridor-loop.jpg`，植被覆盖的史前乐园遗迹长廊。
- 第四关怪物：`assets/images/enemy-pterosaur.png`、`assets/images/enemy-triceratops.png`、`assets/images/enemy-brachiosaurus.png` 与 `assets/images/boss-tyrannosaurus.png`。
- 关卡音乐：`assets/audio/bgm-castle.wav`、`assets/audio/bgm-ocean.wav`、`assets/audio/bgm-penguin-hotel.wav` 与 `assets/audio/bgm-dinosaur-park.wav`，分别对应四关主题的原创循环背景音乐。
- 消灭音效：`assets/audio/sfx-vanish.wav`，用于怪物被成功消灭时的短促反馈音。
- 角色为使用 `imagegen` 生成并本地去背处理的原创奶油橘色小法师猫，不使用参考游戏角色素材。
- 若贴图加载失败，游戏会自动回退到内置 Canvas 主角绘制。

## 本地检查

```bash
node test/gesture.test.js
node test/game-state.test.js
node test/asset-manager.test.js
node test/level-director.test.js
node test/renderer.test.js
node test/sound-manager.test.js
```
