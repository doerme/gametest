'use strict';

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const curricula = require('../src/hanzi/curriculum.json');
const characterData = require('../src/hanzi/data.json');
const common = {
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  bundle: true,
  target: 'es2019',
  legalComments: 'eof',
  logLevel: 'info'
};

async function main() {
  await esbuild.build({ ...common, platform: 'neutral', mainFields: ['module', 'main'], format: 'cjs', minify: true, outfile: 'dist/wechat/game.js', define: { __SPELL_DEV__: 'false', __SPELL_WECHAT__: 'true' } });
  for (let grade = 1; grade <= 6; grade += 1) {
    const characters = [...new Set(curricula.filter((entry) => entry.grade === grade).flatMap((entry) => Array.from(entry.characters)))];
    for (const character of characters) if (!characterData[character]) throw new Error('Missing Hanzi data: ' + character);
    const subset = Object.fromEntries(characters.map((character) => [character, characterData[character]]));
    const directory = path.join(root, 'dist/wechat/hanzi/grade-' + grade);
    fs.mkdirSync(directory, { recursive: true });
    const contents = "'use strict';\n/*! Hanzi Writer Data 2.0.1 / Make Me a Hanzi. Copyright (C) 1999 Arphic Technology Co., Ltd. See ARPHICPL.TXT. */\n"
      + "(typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis).__spellHanziRegister(" + JSON.stringify(subset) + ');\n';
    const bytes = Buffer.byteLength(contents);
    if (bytes >= 4 * 1024 * 1024) throw new Error('Grade ' + grade + ' Hanzi package exceeds 4 MiB');
    fs.writeFileSync(path.join(directory, 'game.js'), contents);
    fs.copyFileSync(path.join(root, 'src/hanzi/ARPHICPL.TXT'), path.join(directory, 'ARPHICPL.TXT'));
    console.log('Hanzi grade ' + grade + ': ' + characters.length + ' glyphs, ' + bytes + ' bytes');
  }
  if (fs.statSync(path.join(root, 'dist/wechat/game.js')).size >= 4 * 1024 * 1024) throw new Error('WeChat main bundle exceeds 4 MiB');
  for (const target of ['wechat', 'web']) {
    fs.mkdirSync(path.join(root, 'dist', target), { recursive: true });
    fs.copyFileSync(path.join(root, 'src/hanzi/ARPHICPL.TXT'), path.join(root, 'dist', target, 'ARPHICPL.TXT'));
  }
  const browser = { ...common, platform: 'browser', format: 'iife', outfile: 'dist/web/game.js', define: { __SPELL_DEV__: 'true', __SPELL_WECHAT__: 'false' } };
  if (process.argv.includes('--serve')) {
    const context = await esbuild.context(browser);
    await context.watch();
    const server = await context.serve({ servedir: root, host: '127.0.0.1', port: 4173 });
    console.log('3D preview: http://127.0.0.1:' + server.port);
  } else {
    await esbuild.build(browser);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
