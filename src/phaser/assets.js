'use strict';

const IMAGE_ASSETS = [
  { key: 'symbolUp', src: 'assets/images/symbol-up.png' },
  { key: 'symbolDown', src: 'assets/images/symbol-down.png' },
  { key: 'symbolLeft', src: 'assets/images/symbol-left.png' },
  { key: 'symbolRight', src: 'assets/images/symbol-right.png' },
  { key: 'symbolV', src: 'assets/images/symbol-v.png' },
  { key: 'symbolL', src: 'assets/images/symbol-l.png' },
  { key: 'symbolCircle', src: 'assets/images/symbol-circle.png' },
  { key: 'symbolZ', src: 'assets/images/symbol-z.png' },
  { key: 'symbolM', src: 'assets/images/symbol-m.png' },
  { key: 'symbolS', src: 'assets/images/symbol-s.png' },
  { key: 'castleCorridorLoop', src: 'assets/images/castle-corridor-loop.jpg' },
  { key: 'oceanSpaceshipCorridorLoop', src: 'assets/images/ocean-spaceship-corridor-loop.jpg' },
  { key: 'penguinHotelCorridorLoop', src: 'assets/images/penguin-hotel-corridor-loop.jpg' },
  { key: 'dinosaurParkCorridorLoop', src: 'assets/images/dinosaur-park-corridor-loop.jpg' }
];

const SPRITESHEET_ASSETS = [
  { key: 'catWalk', src: 'assets/images/cat-walk-v2-sheet.png', frameWidth: 128, frameHeight: 128 },
  { key: 'catCast', src: 'assets/images/cat-cast-v2-sheet.png', frameWidth: 128, frameHeight: 128 },
  { key: 'catHurt', src: 'assets/images/cat-hurt-v2-sheet.png', frameWidth: 128, frameHeight: 128 },
  { key: 'enemyJellyfish', src: 'assets/images/enemy-jellyfish-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'enemyPufferfish', src: 'assets/images/enemy-pufferfish-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'enemyShark', src: 'assets/images/enemy-shark-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'bossMegalodon', src: 'assets/images/boss-megalodon-sheet.png', frameWidth: 512, frameHeight: 512 },
  { key: 'enemyPenguinBellhop', src: 'assets/images/enemy-penguin-bellhop-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'enemyPenguinChef', src: 'assets/images/enemy-penguin-chef-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'bossEmperorPenguin', src: 'assets/images/boss-emperor-penguin-sheet.png', frameWidth: 512, frameHeight: 512 },
  { key: 'enemyPterosaur', src: 'assets/images/enemy-pterosaur-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'enemyTriceratops', src: 'assets/images/enemy-triceratops-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'enemyBrachiosaurus', src: 'assets/images/enemy-brachiosaurus-sheet.png', frameWidth: 384, frameHeight: 384 },
  { key: 'bossTyrannosaurus', src: 'assets/images/boss-tyrannosaurus-sheet.png', frameWidth: 512, frameHeight: 512 }
];

const ENEMY_ASSET_KEYS = {
  jellyfish: 'enemyJellyfish',
  pufferfish: 'enemyPufferfish',
  shark: 'enemyShark',
  megalodon: 'bossMegalodon',
  penguinBellhop: 'enemyPenguinBellhop',
  penguinChef: 'enemyPenguinChef',
  emperorPenguin: 'bossEmperorPenguin',
  pterosaur: 'enemyPterosaur',
  triceratops: 'enemyTriceratops',
  brachiosaurus: 'enemyBrachiosaurus',
  tyrannosaurus: 'bossTyrannosaurus'
};

module.exports = {
  IMAGE_ASSETS,
  SPRITESHEET_ASSETS,
  ENEMY_ASSET_KEYS
};
