'use strict';

const THEME_IDS = {
  CASTLE: 'castle',
  OCEAN: 'ocean',
  PENGUIN_HOTEL: 'penguinHotel',
  DINOSAUR_PARK: 'dinosaurPark',
  SKY_CITY: 'skyCity',
  SEA_TRAIN: 'seaTrain'
};

const THEME_ORDER = [
  THEME_IDS.CASTLE,
  THEME_IDS.OCEAN,
  THEME_IDS.PENGUIN_HOTEL,
  THEME_IDS.DINOSAUR_PARK,
  THEME_IDS.SKY_CITY,
  THEME_IDS.SEA_TRAIN
];

const THEMES = {
  [THEME_IDS.CASTLE]: {
    id: THEME_IDS.CASTLE,
    name: '幽光古堡',
    backgroundAsset: 'castleCorridorLoop',
    music: 'assets/audio/bgm-castle.wav',
    runeColor: 'rgba(255, 235, 171, 0.18)',
    species: new Array(22).fill('ghost')
  },
  [THEME_IDS.OCEAN]: {
    id: THEME_IDS.OCEAN,
    name: '深海飞船长廊',
    backgroundAsset: 'oceanSpaceshipCorridorLoop',
    music: 'assets/audio/bgm-ocean.wav',
    runeColor: 'rgba(115, 244, 255, 0.22)',
    species: [
      'jellyfish', 'jellyfish', 'jellyfish', 'jellyfish', 'pufferfish', 'jellyfish',
      'pufferfish', 'pufferfish', 'jellyfish', 'pufferfish', 'shark', 'shark',
      'pufferfish', 'shark', 'jellyfish', 'jellyfish', 'shark', 'shark',
      'pufferfish', 'shark', 'pufferfish', 'megalodon'
    ]
  },
  [THEME_IDS.PENGUIN_HOTEL]: {
    id: THEME_IDS.PENGUIN_HOTEL,
    name: '极光企鹅酒店',
    backgroundAsset: 'penguinHotelCorridorLoop',
    music: 'assets/audio/bgm-penguin-hotel.wav',
    runeColor: 'rgba(172, 249, 255, 0.28)',
    species: [
      'penguinBellhop', 'penguinChef', 'penguinBellhop', 'penguinChef',
      'penguinBellhop', 'penguinChef', 'penguinBellhop', 'penguinChef',
      'penguinBellhop', 'penguinChef', 'penguinBellhop', 'penguinChef',
      'penguinBellhop', 'penguinChef', 'penguinBellhop', 'penguinChef',
      'penguinBellhop', 'penguinChef', 'penguinBellhop', 'penguinChef',
      'penguinBellhop', 'emperorPenguin'
    ]
  },
  [THEME_IDS.DINOSAUR_PARK]: {
    id: THEME_IDS.DINOSAUR_PARK,
    name: '恐龙乐园',
    backgroundAsset: 'dinosaurParkCorridorLoop',
    music: 'assets/audio/bgm-dinosaur-park.wav',
    runeColor: 'rgba(228, 190, 72, 0.31)',
    species: [
      'pterosaur', 'triceratops', 'brachiosaurus', 'pterosaur', 'triceratops',
      'brachiosaurus', 'pterosaur', 'triceratops', 'brachiosaurus', 'pterosaur',
      'triceratops', 'brachiosaurus', 'pterosaur', 'triceratops', 'brachiosaurus',
      'pterosaur', 'triceratops', 'brachiosaurus', 'pterosaur', 'triceratops',
      'brachiosaurus', 'tyrannosaurus'
    ]
  },
  [THEME_IDS.SKY_CITY]: {
    id: THEME_IDS.SKY_CITY,
    name: '天空之城',
    backgroundAsset: 'skyCityCorridorLoop',
    music: 'assets/audio/bgm-sky-city.wav',
    runeColor: 'rgba(255, 220, 132, 0.3)',
    species: [
      'cloudWisp', 'wingedSentinel', 'cloudWisp', 'wingedSentinel',
      'cloudWisp', 'wingedSentinel', 'cloudWisp', 'wingedSentinel',
      'cloudWisp', 'wingedSentinel', 'cloudWisp', 'wingedSentinel',
      'cloudWisp', 'wingedSentinel', 'cloudWisp', 'wingedSentinel',
      'cloudWisp', 'wingedSentinel', 'cloudWisp', 'wingedSentinel',
      'cloudWisp', 'templeGriffin'
    ]
  },
  [THEME_IDS.SEA_TRAIN]: {
    id: THEME_IDS.SEA_TRAIN,
    name: '海上列车',
    backgroundAsset: 'seaTrainHorizon',
    music: 'assets/audio/bgm-sea-train.wav',
    runeColor: 'rgba(255, 198, 132, 0.28)',
    species: [
      'paperSpirit', 'waveLantern', 'paperSpirit', 'waveLantern',
      'paperSpirit', 'waveLantern', 'paperSpirit', 'waveLantern',
      'paperSpirit', 'waveLantern', 'paperSpirit', 'waveLantern',
      'paperSpirit', 'waveLantern', 'paperSpirit', 'waveLantern',
      'paperSpirit', 'waveLantern', 'paperSpirit', 'waveLantern',
      'paperSpirit', 'trainConductor'
    ]
  }
};

function getTheme(themeId) {
  return THEMES[themeId] || THEMES[THEME_IDS.CASTLE];
}

function createThemeOrder(random) {
  const randomValue = random || Math.random;
  const order = THEME_ORDER.slice();
  for (let i = order.length - 1; i > 0; i -= 1) {
    const value = Math.max(0, Math.min(0.9999999999999999, randomValue()));
    const selectedIndex = Math.floor(value * (i + 1));
    const selectedTheme = order[selectedIndex];
    order[selectedIndex] = order[i];
    order[i] = selectedTheme;
  }
  return order;
}

module.exports = {
  THEME_IDS,
  THEME_ORDER,
  THEMES,
  getTheme,
  createThemeOrder
};
