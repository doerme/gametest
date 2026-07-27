'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'copyright-materials', 'screenshots');
const ENTRY_MODULES = [
  'src/core/GameState.js',
  'src/entities/Enemy.js',
  'src/input/GestureRecognizer.js',
  'src/levels/Themes.js',
  'src/render/Renderer.js'
];

const SCENES = [
  ['health', '01-health-warning.png'],
  ['title', '02-main-title.png'],
  ['castle', '03-gameplay-castle.png'],
  ['ocean', '04-gameplay-ocean.png'],
  ['penguin', '05-gameplay-penguin.png'],
  ['dinosaur', '06-gameplay-dinosaur.png'],
  ['sky', '07-gameplay-sky-city.png'],
  ['train', '08-gameplay-sea-train.png'],
  ['hero', '09-hero-actions.png'],
  ['systems', '10-combat-systems.png'],
  ['transition', '11-level-transition.png'],
  ['win', '12-win.png'],
  ['lose', '13-lose.png']
];

const ASSET_PATHS = {
  catWalk: 'assets/images/cat-walk-v2-sheet.png',
  catCast: 'assets/images/cat-cast-v2-sheet.png',
  catHurt: 'assets/images/cat-hurt-v2-sheet.png',
  symbolUp: 'assets/images/symbol-up.png',
  symbolDown: 'assets/images/symbol-down.png',
  symbolLeft: 'assets/images/symbol-left.png',
  symbolRight: 'assets/images/symbol-right.png',
  symbolV: 'assets/images/symbol-v.png',
  symbolL: 'assets/images/symbol-l.png',
  symbolCircle: 'assets/images/symbol-circle.png',
  symbolZ: 'assets/images/symbol-z.png',
  symbolM: 'assets/images/symbol-m.png',
  symbolS: 'assets/images/symbol-s.png',
  castleCorridorLoop: 'assets/images/castle-corridor-loop.jpg',
  oceanSpaceshipCorridorLoop: 'assets/images/ocean-spaceship-corridor-loop.jpg',
  enemyJellyfish: 'assets/images/enemy-jellyfish-sheet.png',
  enemyPufferfish: 'assets/images/enemy-pufferfish-sheet.png',
  enemyShark: 'assets/images/enemy-shark-sheet.png',
  bossMegalodon: 'assets/images/boss-megalodon-sheet.png',
  penguinHotelCorridorLoop: 'assets/images/penguin-hotel-corridor-loop.jpg',
  enemyPenguinBellhop: 'assets/images/enemy-penguin-bellhop-sheet.png',
  enemyPenguinChef: 'assets/images/enemy-penguin-chef-sheet.png',
  bossEmperorPenguin: 'assets/images/boss-emperor-penguin-sheet.png',
  dinosaurParkCorridorLoop: 'assets/images/dinosaur-park-corridor-loop.jpg',
  enemyPterosaur: 'assets/images/enemy-pterosaur-sheet.png',
  enemyTriceratops: 'assets/images/enemy-triceratops-sheet.png',
  enemyBrachiosaurus: 'assets/images/enemy-brachiosaurus-sheet.png',
  bossTyrannosaurus: 'assets/images/boss-tyrannosaurus-sheet.png'
};

function resolveModule(fromId, request) {
  if (!request.startsWith('.')) {
    throw new Error(`Unsupported external module "${request}" in ${fromId}`);
  }
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), request));
  return resolved.endsWith('.js') ? resolved : `${resolved}.js`;
}

function collectModules(entryIds) {
  const modules = new Map();
  const pending = entryIds.slice();
  const requirePattern = /require\((['"])([^'"]+)\1\)/g;

  while (pending.length > 0) {
    const id = pending.pop();
    if (modules.has(id)) {
      continue;
    }
    const absolutePath = path.join(ROOT, id);
    const source = fs.readFileSync(absolutePath, 'utf8');
    const dependencies = {};
    let match;
    while ((match = requirePattern.exec(source)) !== null) {
      const request = match[2];
      const dependencyId = resolveModule(id, request);
      dependencies[request] = dependencyId;
      pending.push(dependencyId);
    }
    modules.set(id, { source, dependencies });
  }

  return modules;
}

function createBrowserBundle() {
  const modules = collectModules(ENTRY_MODULES);
  const definitions = Array.from(modules.entries()).map(([id, value]) => (
    `${JSON.stringify(id)}:[function(require,module,exports){\n${value.source}\n},${JSON.stringify(value.dependencies)}]`
  )).join(',\n');

  return `
  (function () {
    const modules = {${definitions}};
    const cache = {};
    function load(id) {
      if (cache[id]) return cache[id].exports;
      if (!modules[id]) throw new Error('Module not found: ' + id);
      const module = { exports: {} };
      cache[id] = module;
      const definition = modules[id];
      function localRequire(request) {
        return load(definition[1][request] || request);
      }
      definition[0](localRequire, module, module.exports);
      return module.exports;
    }

    const { GameState, SCREENS } = load('src/core/GameState.js');
    const Enemy = load('src/entities/Enemy.js');
    const { SYMBOLS } = load('src/input/GestureRecognizer.js');
    const { THEME_IDS } = load('src/levels/Themes.js');
    const Renderer = load('src/render/Renderer.js');
    const assetPaths = ${JSON.stringify(ASSET_PATHS)};
    const width = 375;
    const height = 667;
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const loadedAssets = {};

    function loadImage(key, source) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          loadedAssets[key] = image;
          resolve();
        };
        image.onerror = resolve;
        image.src = '/' + source;
      });
    }

    async function prepareAssets() {
      await Promise.all(Object.entries(assetPaths).map(([key, source]) => loadImage(key, source)));
    }

    const assets = {
      getImage(key) {
        return loadedAssets[key] || null;
      }
    };

    const themeSpecs = {
      castle: {
        id: THEME_IDS.CASTLE,
        level: 1,
        species: ['ghost']
      },
      ocean: {
        id: THEME_IDS.OCEAN,
        level: 2,
        species: ['jellyfish', 'pufferfish', 'shark', 'megalodon']
      },
      penguin: {
        id: THEME_IDS.PENGUIN_HOTEL,
        level: 3,
        species: ['penguinBellhop', 'penguinChef', 'emperorPenguin']
      },
      dinosaur: {
        id: THEME_IDS.DINOSAUR_PARK,
        level: 4,
        species: ['pterosaur', 'triceratops', 'brachiosaurus', 'tyrannosaurus']
      },
      sky: {
        id: THEME_IDS.SKY_CITY,
        level: 5,
        species: ['cloudWisp', 'wingedSentinel', 'templeGriffin']
      },
      train: {
        id: THEME_IDS.SEA_TRAIN,
        level: 6,
        species: ['paperSpirit', 'waveLantern', 'trainConductor']
      }
    };

    function createState(themeId, level) {
      const state = new GameState(width, height, null, () => 0.999999);
      const order = [
        THEME_IDS.CASTLE,
        THEME_IDS.OCEAN,
        THEME_IDS.PENGUIN_HOTEL,
        THEME_IDS.DINOSAUR_PARK,
        THEME_IDS.SKY_CITY,
        THEME_IDS.SEA_TRAIN
      ];
      order[level - 1] = themeId;
      state.themeOrder = order;
      state.level = level;
      state.totalLevels = 6;
      state.director.startLevel(level, themeId);
      state.screen = SCREENS.PLAYING;
      state.elapsed = 7.4;
      state.score = 1680 + level * 310;
      state.combo = Math.max(3, level * 4);
      state.difficulty = level % 2 === 0 ? 'plus-one' : 'normal';
      state.items = { healthPotion: 1, comboChain: 2 };
      return state;
    }

    function makeEnemies(species) {
      const positions = [
        { x: 88, y: 175 },
        { x: 286, y: 188 },
        { x: 105, y: 315 },
        { x: 274, y: 328 }
      ];
      const symbols = [
        [SYMBOLS.UP, SYMBOLS.V],
        [SYMBOLS.RIGHT, SYMBOLS.CIRCLE],
        [SYMBOLS.Z, SYMBOLS.LEFT],
        [SYMBOLS.M, SYMBOLS.S, SYMBOLS.DOWN]
      ];
      return species.map((name, index) => new Enemy({
        x: positions[index].x,
        y: positions[index].y,
        radius: index === species.length - 1 && species.length > 1 ? 36 : 27,
        speed: 0.0001,
        symbols: symbols[index],
        score: 100 + index * 100,
        kind: index === species.length - 1 && species.length > 1 ? 'boss' : 'normal',
        species: name,
        symbolDisplay: 'current-and-dots'
      }));
    }

    function drawHeroGallery(renderer, state) {
      renderer.drawBackground(4.8, THEME_IDS.CASTLE);
      ctx.fillStyle = 'rgba(5, 10, 24, 0.74)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff2c2';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('主角形象与动作', width / 2, 74);
      const entries = [
        { y: 205, label: '行走形象', animation: { cast: 0, castAge: 0, hurt: 0, hurtAge: 0 }, drawing: false },
        { y: 365, label: '施法形象', animation: { cast: 0.6, castAge: 0.28, hurt: 0, hurtAge: 0 }, drawing: true },
        { y: 525, label: '受击形象', animation: { cast: 0, castAge: 0, hurt: 0.7, hurtAge: 0.32 }, drawing: false }
      ];
      for (const entry of entries) {
        renderer.drawHero({ x: width / 2, y: entry.y, radius: 34 }, 1.1, entry.animation, entry.drawing);
        ctx.fillStyle = '#d8e6ff';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText(entry.label, width / 2, entry.y + 67);
      }
    }

    async function renderScene(scene) {
      await prepareAssets();
      const renderer = new Renderer(ctx, { width, height }, assets);
      const input = { currentPath: [], isDrawing: false };
      let state = createState(THEME_IDS.CASTLE, 1);

      if (scene === 'health') {
        state.screen = SCREENS.TITLE;
        state.healthNoticeVisible = true;
      } else if (scene === 'title') {
        state.screen = SCREENS.TITLE;
        state.healthNoticeVisible = false;
        state.score = 0;
        state.combo = 0;
        state.items = { healthPotion: 0, comboChain: 0 };
      } else if (themeSpecs[scene]) {
        const spec = themeSpecs[scene];
        state = createState(spec.id, spec.level);
        state.enemies = makeEnemies(spec.species);
      } else if (scene === 'hero') {
        drawHeroGallery(renderer, state);
        return;
      } else if (scene === 'systems') {
        state = createState(THEME_IDS.CASTLE, 4);
        state.themeOrder[3] = THEME_IDS.CASTLE;
        state.combo = 20;
        state.score = 5280;
        state.feedback = { text: '连击命中  获得紫色闪电', age: 0.12, type: 'hit', combo: 20 };
        state.heroAnimation = { cast: 0.62, castAge: 0.26, hurt: 0, hurtAge: 0 };
        state.enemies = makeEnemies(['ghost', 'ghost', 'ghost']);
        state.effects = [{
          type: 'comboChain',
          age: 0.12,
          duration: 0.5,
          originX: state.hero.x,
          originY: state.hero.y,
          targets: state.enemies.map((enemy) => ({
            x: enemy.x,
            y: enemy.y,
            radius: enemy.radius
          }))
        }];
        input.currentPath = [
          { x: 118, y: 410 },
          { x: 255, y: 410 },
          { x: 120, y: 475 },
          { x: 260, y: 475 }
        ];
        input.isDrawing = true;
      } else if (scene === 'transition') {
        state = createState(THEME_IDS.PENGUIN_HOTEL, 2);
        state.themeOrder[2] = THEME_IDS.PENGUIN_HOTEL;
        state.screen = SCREENS.LEVEL_TRANSITION;
        state.level = 2;
        state.score = 2760;
        state.combo = 0;
        state.enemies = [];
      } else if (scene === 'win') {
        state = createState(THEME_IDS.SEA_TRAIN, 6);
        state.screen = SCREENS.WIN;
        state.score = 18680;
        state.combo = 0;
        state.enemies = [];
      } else if (scene === 'lose') {
        state = createState(THEME_IDS.DINOSAUR_PARK, 4);
        state.screen = SCREENS.LOSE;
        state.score = 6420;
        state.lives = 0;
        state.combo = 0;
        state.enemies = [];
      }

      renderer.render(state, input);
    }

    window.renderCopyrightScene = renderScene;
  }());
  `;
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  }[extension] || 'application/octet-stream';
}

function startServer(bundle) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      if (request.url === '/' || request.url.startsWith('/preview')) {
        const html = [
          '<!doctype html><html><head><meta charset="utf-8">',
          '<style>html,body{margin:0;background:#050a18}canvas{display:block;width:375px;height:667px}</style>',
          '</head><body><canvas width="375" height="667"></canvas>',
          `<script>${bundle}</script></body></html>`
        ].join('');
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(html);
        return;
      }

      const requestPath = decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '');
      const filePath = path.resolve(ROOT, requestPath);
      if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath)) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const bundle = createBrowserBundle();
  const server = await startServer(bundle);
  const address = server.address();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2
    });
    await page.goto(`http://127.0.0.1:${address.port}/preview`, { waitUntil: 'networkidle' });
    const canvas = page.locator('canvas');

    for (const [scene, filename] of SCENES) {
      await page.evaluate((name) => window.renderCopyrightScene(name), scene);
      await canvas.screenshot({ path: path.join(OUTPUT_DIR, filename) });
      console.log(`Generated: ${path.join(OUTPUT_DIR, filename)}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
