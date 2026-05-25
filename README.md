# 符咒学院 MVP

一个原创微信小游戏 MVP：玩家通过触摸画符，帮助不断前进的小法师猫穿过中世纪古堡大厅、深海飞船长廊、极光企鹅酒店与恐龙乐园，消除靠近的怪物。四套主题每局会以不重复的随机顺序出现；玩法参考“敌人带符号、玩家画符施法”的经典结构，但角色、视觉和命名均为原创。

## 运行

1. 打开微信开发者工具。
2. 选择“小游戏”并导入本目录：`/Users/liangxiaoming/Documents/game`。
3. AppID 可先使用测试号或保留 `touristappid`。
4. 点击编译后，在模拟器中点击开始游戏。
5. 真机预览时，修改代码或贴图后请重新编译并重新生成预览二维码。

## 核心操作

- 每一关开始前选择 `普通难度` 或 `+1 难度`；`+1` 会让本关敌人移动、出怪与场景滚动速度提高 `50%`。
- 每局四关会随机安排四套场景、音乐和敌人外观主题，同一局不会重复；关卡编号仍决定难度进度和符咒解锁。
- 右上角 `声音 开 / 声音 关` 可以随时切换背景音乐与消灭音效，首次启动默认为开启。
- 看到 `↑ / ↓ / ← / →` 时，按箭头方向划线；看到 `V / L` 时，照形状画。
- 进入第三关后新增 `○` 圆形符咒，沿着圆环绘制即可。
- 进入第四关后新增实战符咒 `Z`，沿三段折线轨迹绘制即可。
- 敌人符号队列清空后消失并加分。
- 一次施法会命中所有“队列首符号”匹配的敌人；多符号敌人需要连续画完队列才会消失。
- 连续有效施法会积累 `COMBO`；消灭怪物时，`Combo x3 / x5 / x10 / x20 / x50 / x100` 起分别获得 `1.2x / 1.5x / 2.0x / 2.5x / 3.0x / 4.0x` 基础消灭分倍率，徽章随档位强化并放大，Miss、掉心或换关会清零。
- 每达到 `Combo x10` 的倍数会触发紫色连锁闪电；每达到 `Combo x15` 的倍数会尝试出现血瓶，场上已有血瓶时不会重复生成。按照瓶子上方的符咒解锁后恢复 `1` 颗爱心，普通难度需要 `1` 笔，`+1` 难度需要 `2` 笔。
- 第一关与第二关结束后会进入下一关难度选择页；重新选择后继续闯关，得分和剩余生命会延续。
- 第二关起敌人只展示当前需要绘制的符号，圆点表示尚未揭示的后续符号数量。
- 第三关起新增 `○` 并沿用隐藏队列机制，长 Boss 队列会显示当前符号和剩余数量。
- 第四关首次携带 `Z` 符咒，最终 Boss 会混合考察全部符咒；这些规则不受随机主题影响。
- 四关 Boss 的符咒数量依次为 `6 / 8 / 10 / 12`，后续关卡出怪更密且移动更快。
- 通关或失败后点击重开会回到第一关难度选择页。
- 敌人碰到主角会扣 1 点生命并触发短震动反馈，生命归零失败。
- 猫猫位置固定在屏幕下方，滚动背景会呈现持续向屏幕上方行走的效果。

## 角色资源

- 主角贴图：`assets/images/cat-walk-v2-sheet.png`、`assets/images/cat-cast-v2-sheet.png`、`assets/images/cat-hurt-v2-sheet.png`，分别对应行走、施法、受击动画；每张均为 12 帧横向透明精灵图，每帧 `128 x 128`。
- 手势提示图标：`assets/images/symbol-up.png`、`symbol-down.png`、`symbol-left.png`、`symbol-right.png`、`symbol-v.png`、`symbol-l.png`、`symbol-circle.png` 与 `symbol-z.png`，分别用于敌人与血瓶上方的八种符咒；可用 `node scripts/generate-symbol-icons.js` 重新生成高清透明图标。
- 主角动画轨道在 `src/render/Renderer.js` 的 `HERO_SPRITE.animations` 中独立配置：`walk`、`cast`、`hurt` 均可分别调整使用的帧序列和 `fps`，施法与受击会从各自首帧开始播放。
- 十二帧动画当前节奏为：行走 `12 fps`、施法 `16 fps`、受击 `14 fps`；施法与受击的角色动作窗口独立于短促特效，保证动作能完整舒展播放。
- 古堡主题背景：`assets/images/castle-corridor-loop.jpg`，原创斜俯视古堡长廊无缝地图；整张地图与火把光晕会持续向下循环滚动。
- 深海主题背景：`assets/images/ocean-spaceship-corridor-loop.jpg`，原创俯视深海飞船酒店风格长廊，以舷窗、水光和蓝青灯带构成滚动场景。
- 第一关幽灵为 Canvas 三帧形变循环；其余怪物均使用 `6 fps` 的三帧透明精灵图循环。
- 深海主题怪物：`assets/images/enemy-jellyfish-sheet.png`、`assets/images/enemy-pufferfish-sheet.png`、`assets/images/enemy-shark-sheet.png` 与 `assets/images/boss-megalodon-sheet.png`。
- 企鹅酒店主题背景：`assets/images/penguin-hotel-corridor-loop.jpg`，企鹅酒店主题启发的原创极地冰川长廊，以冰蓝材质和极光灯带构成滚动场景。
- 企鹅酒店主题怪物：`assets/images/enemy-penguin-bellhop-sheet.png`、`assets/images/enemy-penguin-chef-sheet.png` 与 `assets/images/boss-emperor-penguin-sheet.png`。
- 恐龙主题背景：`assets/images/dinosaur-park-corridor-loop.jpg`，植被覆盖的史前乐园遗迹长廊。
- 恐龙主题怪物：`assets/images/enemy-pterosaur-sheet.png`、`assets/images/enemy-triceratops-sheet.png`、`assets/images/enemy-brachiosaurus-sheet.png` 与 `assets/images/boss-tyrannosaurus-sheet.png`。
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
