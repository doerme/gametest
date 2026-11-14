# 角色建模参考清单

法师猫采用用户提供的三视图，其余角色以项目原始素材为造型来源。共法师猫、18 种怪物及幽灵首领变体，共20套预览；首领尺寸仍由原有关卡规则控制。参考图片仅用于对照，角色运行时不加载图片贴图。

| 角色 | 参考来源 | 建模重点 |
| --- | --- | --- |
| 法师猫 | 用户三视图：`docs/references/cat-turnaround.png` | 奶白圆脸、酒红棕大眼、粉鼻腮红与张嘴笑、宽檐紫帽、淡蓝蝴蝶结、星形吊坠、金边法袍、月牙腰扣、星月长披风及正视图左侧星形法杖 |
| 幽灵 | `src/render/Renderer.js` 的 `drawGhostEnemy()` | 淡蓝幽灵布裙、两只深色眼睛、波浪下摆 |
| 幽灵首领 | `src/render/Renderer.js` 的 `drawGhostEnemy()` | 紫色布裙；首领以游戏尺寸及表情区分 |
| 水母 | `assets/images/enemy-jellyfish.png` | 青蓝钟形伞盖、发光伞沿、弯曲触须 |
| 河豚 | `assets/images/enemy-pufferfish.png` | 金黄鼓身、尖刺、绿鳍、鼓腮和环形嘴 |
| 鲨鱼 | `assets/images/enemy-shark.png` | 蓝色流线鱼身、白腹、背鳍、新月尾鳍与鳃缝 |
| 巨齿鲨 | `assets/images/boss-megalodon.png` | 深蓝装甲、双排尖牙、青色鳃光与背脊 |
| 企鹅门童 | `assets/images/enemy-penguin-bellhop.png` | 蓝色金边制服、双排扣、帽檐与棕色行李箱 |
| 企鹅厨师 | `assets/images/enemy-penguin-chef.png` | 白厨师帽、蓝围裙、手托纸杯蛋糕 |
| 皇帝企鹅 | `assets/images/boss-emperor-penguin.png` | 冰晶王冠和肩甲、深蓝披风、胸前宝石 |
| 翼龙 | `assets/images/enemy-pterosaur.png` | 绿身、赭色膜翼与支骨、长喙和头冠 |
| 三角龙 | `assets/images/enemy-triceratops.png` | 绿褐身、扇形颈盾、三根角、四足 |
| 腕龙 | `assets/images/enemy-brachiosaurus.png` | 绿色长颈、浅色颈腹、深绿背斑、四足 |
| 霸王龙 | `assets/images/boss-tyrannosaurus.png` | 赤褐身、张口双排牙、短前肢、金色脊饰 |
| 云灵 | `src/render/Renderer.js` 的 `drawSkyCityEnemyFallback()` | 白青云团、金色环轨和符片、青色核心 |
| 翼卫 | `src/render/Renderer.js` 的 `drawSkyCityEnemyFallback()` | 米金铠甲、额顶尖饰、羽翼、青色胸核 |
| 神殿狮鹫 | `src/render/Renderer.js` 的 `drawSkyCityEnemyFallback()` | 金色兽身、鹰喙、白羽翼、胸甲与青色核心 |
| 纸灵 | `src/render/Renderer.js` 的 `drawSeaTrainEnemyFallback()` | 米白折纸、折痕、眼睛和微笑、波浪纸脚 |
| 浪灯 | `src/render/Renderer.js` 的 `drawSeaTrainEnemyFallback()` | 暖黄灯体、棕色灯骨和提环、青色浪带 |
| 列车长 | `src/render/Renderer.js` 的 `drawSeaTrainEnemyFallback()` | 深蓝长制服、高帽、金眼徽章、红领巾、怀表链与水汽 |

## 预览与集成

执行 `npm run preview:models`，打开 `output/three-qa/models/index.html`。猫咪提供参考图和正交正面、90°侧面、背面，可切换45°转角并拖动旋转；其他角色保留原有三个视角。支持行走、待机、施法和受伤姿态，以及微信兼容材质切换。同目录包含标准／兼容材质截图、猫咪动作截图和 `contact-sheet.png` 总览。

猫咪的“首页待机 / 表情”预览包含轻歪头、自然眨眼、耳朵微动、呼吸、帽尖吊坠和领口飘带摆动；约每4.2秒眨眼一次，持续0.16秒，歪头不超过4度。施法时长披风向后扬起，避开内袍，受伤时优先保留原有反馈。模型实例共享几何与材质，各自保存动画变换。

三视图版本为15,016个三角形、16个网格，约束上限为16,000三角形和16次绘制；其他角色维持原有约束。帽檐、披风和前襟采用有内外表面的曲面壳体，星月图案贴合曲面，尾巴条纹为连续管状曲面的分段着色。所有细节均为几何体，无新增纹理或离屏 Canvas。

`cat-idle.png`、`cat-blink.png`、`cat-walk.png`、`cat-cast.png`、`cat-hurt.png` 记录五类姿态，兼容材质版本带 `-compatible` 后缀。`cat-orthographic.png` 为正交三视图，`cat-45.png` 为转角预览。`cat-turnaround-comparison.html` 和同名 PNG 展示完整参考图、本轮重构前模型与新模型；`turnaround-before-*` 和更早的 `before-*` 基线分别保留。

模型本地正面为+Z；游戏中仅猫咪整体转向−Z。法杖由正视图左侧的手持握，`castTip` 位于金星中心并随手臂动作。首页根据法杖所在方向向外发射，窄屏裁剪区也不会将发射方向反转。头顶符号根据模型体积与当前变换投影定位。

首页使用猫咪预先缓存的动作包围范围，包含歪头、双耳、施法、四肢及展示转向；据此统一缩放，上下沿停留时不因表情变化而改变大小。

几何体、材质、静态合并及预制件缓存继续由现有工厂管理。带镜像缩放的部件在合并时修正三角形绕序，避免耳朵等部位背面被剔除。角色参考数据与旧版 Renderer 只在预览工具内引用，不进入微信包。

无图角色的立体深度和背面是基于旧二维轮廓的三维补全；有图角色采用移动端卡通化比例，保留可辨识的颜色、轮廓与配件。
