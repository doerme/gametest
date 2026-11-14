'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const references = require('./model-references');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'output/three-qa/models');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const name of ['cat.png', 'cat-compatible.png', 'cat-walk.png', 'cat-cast.png', 'cat-hurt.png']) {
    const baseline = path.join(output, 'before-' + name), current = path.join(output, name);
    if (!fs.existsSync(baseline) && fs.existsSync(current)) fs.copyFileSync(current, baseline);
  }
  const build = await esbuild.build({ entryPoints: [path.join(__dirname, 'model-gallery.js')], bundle: true, write: false, minify: true, platform: 'browser', format: 'iife' });
  const images = Object.fromEntries(references.filter((r) => r.image).map((r) => [r.image, 'data:image/png;base64,' + fs.readFileSync(r.referenceFile ? path.join(root, r.referenceFile) : path.join(root, 'assets/images', r.image)).toString('base64')]));
  const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>符咒学院 · 角色对照与 3D 预览</title><style>
*{box-sizing:border-box}body{margin:0;padding:26px;background:#e8eee9;color:#263e42;font:15px -apple-system,BlinkMacSystemFont,sans-serif}h1{font-size:25px;margin:0 0 18px}button,select{font:inherit;padding:8px 12px;border:1px solid #b3c2ba;border-radius:8px;background:white;color:inherit;margin-right:8px}header{margin-bottom:20px}#card{width:1240px;background:#e8eee9;border:1px solid #baccc1;border-radius:16px;overflow:hidden}.caption{display:flex;justify-content:space-between;padding:18px 22px;background:#d6e3d9}#name{font-size:23px;font-weight:650}.views{display:flex;padding:4px 12px}.reference{width:256px;flex-shrink:0}canvas{display:block}.labels{display:grid;grid-template-columns:256px 320px 320px 320px;text-align:center;padding:12px;color:#557366}#features{padding:10px 22px 22px;margin:0;line-height:1.5}.hint{font-size:13px;color:#557366;margin-top:18px}</style>
<h1>符咒学院 · 参考形象 → 3D 角色</h1><header><select id="species"></select><select id="motion"><option value="walk">行走</option><option value="idle">首页待机 / 表情</option><option value="cast">施法</option><option value="hurt">受伤</option></select><select id="material"><option value="standard">标准材质</option><option value="lambert">微信兼容材质</option></select><select id="view"><option value="ortho">猫咪正交三视图</option><option value="quarter">猫咪45°转角</option></select><button id="play">播放动画</button></header>
<div id="card"><div class="caption"><span id="name"></span><span id="stats"></span></div><div class="labels"><span>旧版参考</span><span>正面</span><span>侧前方</span><span>背面</span></div><div class="views"><canvas id="legacy" width="256" height="340"></canvas><canvas id="models"></canvas></div><p id="features"></p></div><p class="hint">拖动 3D 画面旋转视角。无独立图片的角色，左侧由旧版二维绘制代码直接绘制。猫咪在游戏中以背面朝向玩家。</p>
<script>window.referenceImages=${JSON.stringify(images)};</script><script>${build.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></html>`;
  fs.writeFileSync(path.join(output, 'index.html'), html);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1300, height: 640 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file://' + path.join(output, 'index.html')); await page.waitForFunction(() => window.galleryReady);
    const metrics = [];
    for (let i = 0; i < references.length; i++) {
      metrics.push(await page.evaluate((index) => window.modelGallery.select(index), i));
      await page.locator('#card').screenshot({ path: path.join(output, references[i].id + '.png') });
    }
    const poses = [['walk', 'walk', 0.41], ['idle', 'idle', 2.1], ['blink', 'idle', 3.88], ['cast', 'cast', 0.41], ['hurt', 'hurt', 0.41]];
    const capturePoses = async (suffix) => {
      await page.evaluate(() => window.modelGallery.select(0));
      for (const [name, motion, seconds] of poses) {
        await page.evaluate(({ motion, seconds }) => window.modelGallery.pose(motion, seconds), { motion, seconds });
        await page.locator('#card').screenshot({ path: path.join(output, 'cat-' + name + suffix + '.png') });
      }
      await page.evaluate(() => window.modelGallery.pose('walk', 0));
    };
    await capturePoses('');
    await page.evaluate(() => window.modelGallery.setMode('lambert'));
    for (let i = 0; i < references.length; i++) {
      await page.evaluate((index) => window.modelGallery.select(index), i);
      await page.locator('#card').screenshot({ path: path.join(output, references[i].id + '-compatible.png') });
    }
    await capturePoses('-compatible');
    await page.evaluate(() => { window.modelGallery.setMode('standard'); window.modelGallery.setView('quarter'); });
    await page.locator('#card').screenshot({ path: path.join(output, 'cat-45.png') });
    await page.evaluate(() => window.modelGallery.setView('ortho'));
    await page.locator('#models').screenshot({ path: path.join(output, 'cat-orthographic.png') });
    assert.deepStrictEqual(errors, []);
    fs.writeFileSync(path.join(output, 'metrics.json'), JSON.stringify(metrics, null, 2));
    await page.evaluate((items) => {
      document.body.innerHTML = '<div id="overview" style="display:grid;grid-template-columns:620px 620px;gap:8px"></div>';
      items.forEach((r) => { const image = document.createElement('img'); image.src = r.id + '.png'; image.style.width = '620px'; document.getElementById('overview').appendChild(image); });
    }, references);
    await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
    await page.locator('#overview').screenshot({ path: path.join(output, 'contact-sheet.png') });
    if (fs.existsSync(path.join(output, 'before-cat.png'))) {
      const comparison = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>猫咪建模升级对照</title><style>body{margin:0;background:#e8eee9;color:#263e42;font:18px sans-serif}main{width:1240px;padding:18px 0}h1,h2{margin:12px 24px}h1{font-size:26px}h2{font-size:20px}img{display:block;width:1240px}p{margin:12px 24px;line-height:1.6}</style><main id="comparison"><h1>法师猫 · 建模升级前后</h1><h2>升级前</h2><img src="before-cat.png"><h2>升级后</h2><img src="cat.png"><p>宽檐紫帽与淡蓝蝴蝶结 · 金边法袍与月牙腰扣 · 星月披风与星形法杖 · 自然眨眼、轻歪头与吊坠摆动</p></main></html>`;
      fs.writeFileSync(path.join(output, 'cat-comparison.html'), comparison);
      await page.goto('file://' + path.join(output, 'cat-comparison.html'));
      await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
      await page.locator('#comparison').screenshot({ path: path.join(output, 'cat-comparison.png') });
    }
    fs.copyFileSync(path.join(root, 'docs/references/cat-turnaround.png'), path.join(output, 'cat-reference.png'));
    const baseline = fs.existsSync(path.join(output, 'turnaround-before-cat.png')) ? '<h2>本轮重构前</h2><img src="turnaround-before-cat.png">' : '';
    const turnaround = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>法师猫三视图重构对照</title><style>body{margin:0;background:#e8eee9;color:#263e42;font:18px sans-serif}main{width:1240px;padding:18px 0}h1,h2,p{margin:16px 24px}h1{font-size:26px}h2{font-size:20px}img{display:block;width:1240px}.reference{width:850px;margin:auto}p{line-height:1.6}</style><main id="turnaround"><h1>法师猫 · 参考图 / 重构前 / 重构后</h1><h2>用户提供的三视图</h2><img class="reference" src="cat-reference.png">${baseline}<h2>重构后 · 正交正面 / 侧面 / 背面</h2><img src="cat.png"><h2>45°转角</h2><img src="cat-45.png"><p>宽檐紫帽 · 淡蓝蝴蝶结 · 金边法袍 · 月牙腰扣 · 星月披风 · 左侧星形法杖</p></main></html>`;
    fs.writeFileSync(path.join(output, 'cat-turnaround-comparison.html'), turnaround);
    await page.goto('file://' + path.join(output, 'cat-turnaround-comparison.html'));
    await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
    await page.locator('#turnaround').screenshot({ path: path.join(output, 'cat-turnaround-comparison.png') });
    console.log('Rendered ' + metrics.length + ' reference comparisons in standard and compatible materials: ' + output);
  } finally { await browser.close(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
