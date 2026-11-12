# 角色 2D → 3D 参考清单

以项目原始素材为造型来源。共法师猫、18 种怪物及幽灵首领变体，共 20 套预览；首领尺寸仍由原有关卡规则控制。旧图片仅用于对照，角色运行时不加载图片贴图。

| 角色 | 参考来源 | 建模重点 |
| --- | --- | --- |
| 法师猫 | `assets/images/cat-walk-v2-sheet.png`，首帧 128 × 128 | 橘白条纹、米色弯尖帽、紫金披风、条纹卷尾；游戏中背向玩家 |
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

执行 `npm run preview:models`，打开 `output/three-qa/models/index.html`。每个角色提供旧图／旧二维绘制结果和三个 3D 视角，可拖动旋转、播放行走或待机，查看施法和受伤姿态，以及切换微信兼容材质。同目录包含每个角色的标准／兼容材质截图、猫咪动作截图和 `contact-sheet.png` 总览。

模型本地正面为 +Z；游戏中仅猫咪整体转向 −Z。施法特效从手杖的 `castTip` 世界坐标发出，跟随手臂动作。头顶符号根据模型体积与当前变换投影定位。

几何体、材质、静态合并及预制件缓存继续由现有工厂管理。带镜像缩放的部件在合并时修正三角形绕序，避免耳朵等部位背面被剔除。角色参考数据与旧版 Renderer 只在预览工具内引用，不进入微信包。

无图角色的立体深度和背面是基于旧二维轮廓的三维补全；有图角色采用移动端卡通化比例，保留可辨识的颜色、轮廓与配件。
