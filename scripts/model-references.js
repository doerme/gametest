'use strict';
// QA-only inventory: none of these historical image paths enter the game bundle.
module.exports = [
  { id: 'cat', name: '法师猫', image: 'cat-walk-v2-sheet.png', sheet: true, features: '圆脸幼猫、双高光大眼、粉鼻腮红、心形肉垫、柔软星饰帽、星月披风与贴合曲面的条纹卷尾；首页眨眼歪头，游戏中背向玩家' },
  { id: 'ghost', name: '幽灵', draw: 'drawGhostEnemy', features: '淡蓝幽灵布裙、两只深色眼睛、波浪下摆' },
  { id: 'ghostBoss', species: 'ghost', boss: true, name: '幽灵首领', draw: 'drawGhostEnemy', features: '紫色布裙；首领以游戏尺寸及表情区分' },
  { id: 'jellyfish', name: '水母', image: 'enemy-jellyfish.png', features: '青蓝钟形伞盖、发光伞沿、弯曲触须' },
  { id: 'pufferfish', name: '河豚', image: 'enemy-pufferfish.png', features: '金黄鼓身、尖刺、绿鳍、鼓腮和环形嘴' },
  { id: 'shark', name: '鲨鱼', image: 'enemy-shark.png', features: '蓝色流线鱼身、白腹、背鳍、新月尾鳍与鳃缝' },
  { id: 'megalodon', boss: true, name: '巨齿鲨', image: 'boss-megalodon.png', features: '深蓝装甲、双排尖牙、青色鳃光与背脊' },
  { id: 'penguinBellhop', name: '企鹅门童', image: 'enemy-penguin-bellhop.png', features: '蓝色金边制服、双排扣、帽檐与棕色行李箱' },
  { id: 'penguinChef', name: '企鹅厨师', image: 'enemy-penguin-chef.png', features: '白厨师帽、蓝围裙、手托纸杯蛋糕' },
  { id: 'emperorPenguin', boss: true, name: '皇帝企鹅', image: 'boss-emperor-penguin.png', features: '冰晶王冠和肩甲、深蓝披风、胸前宝石' },
  { id: 'pterosaur', name: '翼龙', image: 'enemy-pterosaur.png', features: '绿身、赭色膜翼与支骨、长喙和头冠' },
  { id: 'triceratops', name: '三角龙', image: 'enemy-triceratops.png', features: '绿褐身、扇形颈盾、三根角、四足' },
  { id: 'brachiosaurus', name: '腕龙', image: 'enemy-brachiosaurus.png', features: '绿色长颈、浅色颈腹、深绿背斑、四足' },
  { id: 'tyrannosaurus', boss: true, name: '霸王龙', image: 'boss-tyrannosaurus.png', features: '赤褐身、张口双排牙、短前肢、金色脊饰' },
  { id: 'cloudWisp', name: '云灵', draw: 'drawSkyCityEnemyFallback', features: '白青云团、金色环轨和符片、青色核心' },
  { id: 'wingedSentinel', name: '翼卫', draw: 'drawSkyCityEnemyFallback', features: '米金铠甲、额顶尖饰、羽翼、青色胸核' },
  { id: 'templeGriffin', boss: true, name: '神殿狮鹫', draw: 'drawSkyCityEnemyFallback', features: '金色兽身、鹰喙、白羽翼、胸甲与青色核心' },
  { id: 'paperSpirit', name: '纸灵', draw: 'drawSeaTrainEnemyFallback', features: '米白折纸、折痕、眼睛和微笑、波浪纸脚' },
  { id: 'waveLantern', name: '浪灯', draw: 'drawSeaTrainEnemyFallback', features: '暖黄灯体、棕色灯骨和提环、青色浪带' },
  { id: 'trainConductor', boss: true, name: '列车长', draw: 'drawSeaTrainEnemyFallback', features: '深蓝长制服、高帽、金眼徽章、红领巾、怀表链与水汽' }
];
