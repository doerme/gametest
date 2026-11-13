'use strict';

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const common = {
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  bundle: true,
  target: 'es2019',
  legalComments: 'eof',
  logLevel: 'info'
};

async function main() {
  await esbuild.build({ ...common, platform: 'neutral', mainFields: ['module', 'main'], format: 'cjs', minify: true, outfile: 'dist/wechat/game.js', define: { __SPELL_DEV__: 'false' } });
  for (const target of ['wechat', 'web']) {
    fs.mkdirSync(path.join(root, 'dist', target), { recursive: true });
    fs.copyFileSync(path.join(root, 'src/hanzi/ARPHICPL.TXT'), path.join(root, 'dist', target, 'ARPHICPL.TXT'));
  }
  const browser = { ...common, platform: 'browser', format: 'iife', outfile: 'dist/web/game.js', define: { __SPELL_DEV__: 'true' } };
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
