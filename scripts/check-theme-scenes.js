'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { THEMES } = require('../src/levels/Themes');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');

// Called by the GPU browser suite. Screenshots use the same composition as the
// saved pre-upgrade baseline and do not depend on the run's shuffled theme order.
async function checkThemeScenes(page, output, themes) {
  const directory = path.join(output, 'themes');
  for (const folder of ['after', 'frames', 'blind', '375x667', '320x568']) fs.mkdirSync(path.join(directory, folder), { recursive: true });
  const samples = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => window.__spellGame.state.width === document.getElementById('game').clientWidth);
    for (const theme of themes) {
      const result = await page.evaluate((id) => {
        const g = window.__spellGame, s = g.state; g.pause();
        s.healthNoticeVisible = false; s.start('normal', 'symbol'); s.level = 1; s.themeOrder[0] = id; s.screen = 'playing';
        s.director.startLevel(1, id); s.director.index = s.director.total; s.enemies = []; s.effects = []; s.elapsed = 4; s.feedback = null;
        g.input.lastCompletedPath = null; g.renderer.visualTime = 2;
        for (let i = 0; i < 2; i += 1) {
          const enemy = s.director.createEnemy(s.director.config.timeline[i], i);
          enemy.x = s.width * (i ? 0.72 : 0.3); enemy.y = s.height * (i ? 0.4 : 0.27); enemy.symbols = [i ? 'v' : 'up']; enemy.phase = i; s.enemies.push(enemy);
        }
        g.renderer.render(s, g.input, 0);
        let sceneTriangles = 0;
        g.renderer.theme.traverse((n) => { if (n.isMesh) sceneTriangles += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; });
        return { ...g.getStats(), width: s.width, height: s.height, sceneTriangles, expectedSymbols: g.renderer.getGestureContext(s).expectedSymbols,
          anchors: g.renderer.anchors.map((a) => ({ x: a.x, y: a.y, visible: a.visible })),
          badges: [...g.renderer.hud.badges].filter(([enemy, group]) => s.enemies.includes(enemy) && group.visible).map(([, group]) => ({ x: group.position.x, y: group.position.y })) };
      }, theme);
      assert.ok(result.sceneTriangles <= 24000, theme + ' complete scene geometry budget');
      assert.ok(result.calls <= 200 && result.triangles <= 100000);
      assert.strictEqual(result.textures, 2);
      assert.ok(['up', 'v'].every((symbol) => result.expectedSymbols.includes(symbol)), 'both visible enemies remain available to gesture assistance');
      assert.ok(result.anchors.every((a) => a.visible), theme + ' visible character anchors');
      assert.strictEqual(result.badges.length, 2);
      assert.ok(result.badges.every((b) => b.x >= 22 && b.x <= result.width - 22 && b.y >= 106 && b.y <= result.height - 165), theme + ' readable final badge placement');
      const audio = getAudioToggleBounds(result.width);
      assert.ok(result.badges.every((b) => b.x + 16 < audio.x || b.x - 16 > audio.x + audio.width || b.y + 16 < audio.y || b.y - 16 > audio.y + audio.height), theme + ' badges avoid the audio button');
      const folder = viewport.width === 390 ? 'after' : viewport.width + 'x' + viewport.height;
      await page.screenshot({ path: path.join(directory, folder, theme + '.png') });
      samples.push({ theme, viewport, ...result });
      if (viewport.width !== 390) continue;
      fs.copyFileSync(path.join(directory, 'after', theme + '.png'), path.join(directory, 'frames', theme + '-2.png'));
      for (const time of [0, 4]) {
        await page.evaluate((time) => { const g = window.__spellGame; g.renderer.visualTime = time; g.renderer.render(g.state, g.input, 0); }, time);
        await page.screenshot({ path: path.join(directory, 'frames', theme + '-' + time + '.png') });
      }
      await page.evaluate(() => { const g = window.__spellGame; g.renderer.hud.scene.visible = false; g.renderer.visualTime = 2; g.renderer.render(g.state, g.input, 0); });
      try { await page.screenshot({ path: path.join(directory, 'blind', theme + '.png') }); }
      finally { await page.evaluate(() => { const g = window.__spellGame; g.renderer.hud.scene.visible = true; g.renderer.render(g.state, g.input, 0); }); }
    }
  }
  const before = await page.evaluate(() => ({ time: window.__spellGame.renderer.visualTime, frame: Array.from(window.__spellGame.renderer.theme.userData.ambient.positions.array) }));
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({ time: window.__spellGame.renderer.visualTime, frame: Array.from(window.__spellGame.renderer.theme.userData.ambient.positions.array) }));
  assert.deepStrictEqual(before, after, 'pausing freezes the environment without drift');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.__spellGame.state.width === document.getElementById('game').clientWidth);
  writeGallery(directory, themes);
  const gallery = await page.context().browser().newPage({ viewport: { width: 1320, height: 1100 }, deviceScaleFactor: 1 });
  try {
    await gallery.setViewportSize({ width: 1320, height: 1100 });
    await gallery.goto(new URL('/output/three-qa/themes/index.html', page.url()).href);
    await gallery.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
    await gallery.screenshot({ path: path.join(directory, 'comparison.png'), fullPage: true });
    await gallery.locator('[data-mode="overview"]').click();
    await gallery.setViewportSize({ width: 1320, height: 650 });
    await gallery.screenshot({ path: path.join(directory, 'overview.png'), fullPage: true });
  } finally { await gallery.close(); }
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify({ samples, pauseFreezesEnvironment: true }, null, 2));
  return { samples, pauseFreezesEnvironment: true, gallery: 'themes/index.html' };
}

function writeGallery(directory, themes) {
  const cards = themes.map((id, index) => {
    const hasBefore = fs.existsSync(path.join(directory, 'before', id + '.png'));
    return `<article><h2><span class="theme-name">${THEMES[id].name}</span><span class="number">${index + 1}</span></h2>
      <div class="comparison">${hasBefore ? `<figure class="before"><figcaption>升级前</figcaption><img src="before/${id}.png" alt="升级前"></figure>` : ''}
      <figure><figcaption class="after-label">升级后</figcaption><img class="result" data-id="${id}" src="after/${id}.png" alt="场景预览"></figure></div>
      <div class="frames">${[0, 2, 4].map((t) => `<figure><figcaption>${t} 秒</figcaption><img src="frames/${id}-${t}.png" alt="${t} 秒关键帧"></figure>`).join('')}</div>
      <p class="sizes"><a href="375x667/${id}.png">375 × 667</a><a href="320x568/${id}.png">320 × 568</a></p></article>`;
  }).join('');
  fs.writeFileSync(path.join(directory, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>符咒学院 · 六大主题场景对照</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#151b2d;color:#f4e8d2;font:14px/1.6 system-ui,sans-serif}h1{font-size:26px;margin:0 0 4px}header p{color:#b8c1d5;margin:4px 0 18px}nav{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 22px}button{font:inherit;border:1px solid #6c6384;background:#29273f;color:inherit;padding:8px 16px;border-radius:20px;cursor:pointer}button[aria-pressed=true]{background:#e9c797;color:#25243c}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{padding:14px;background:#20263a;border:1px solid #3a3e56;border-radius:16px}h2{font-size:17px;margin:0 0 10px}.number{display:none}.comparison,.frames{display:flex;gap:10px}figure{margin:0;flex:1;min-width:0}figcaption{color:#b8c1d5;text-align:center;margin:0 0 6px}img{display:block;width:100%;border-radius:7px}.frames{display:none}.sizes{display:flex;gap:16px;font-size:12px;margin:10px 0 0}a{color:#cfc4ed}.overview main,.blind main{grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.overview .before,.blind .before,.overview figcaption,.blind figcaption,.overview .sizes,.blind .sizes{display:none}.overview article,.blind article{padding:9px}.overview h2,.blind h2{font-size:14px}.blind .theme-name{display:none}.blind .number{display:inline}.keyframes main{grid-template-columns:repeat(2,minmax(0,1fr))}.keyframes .comparison{display:none}.keyframes .frames{display:flex}@media(max-width:760px){main,.keyframes main{grid-template-columns:1fr}.overview main,.blind main{grid-template-columns:repeat(2,minmax(0,1fr))}body{padding:16px}}</style>
    <header><h1>六大关卡 · 梦幻童话 3D</h1><p>相同角色位置与时间的前后对照；关键帧保持通道位置固定，展示环境变化。升级前图片仅在本地已保存时展示。</p></header>
    <nav>${[['comparison','前后对照'],['overview','六关总览'],['keyframes','动态关键帧'],['blind','隐藏主题名称']].map(([mode,label])=>`<button data-mode="${mode}" aria-pressed="${mode==='comparison'}">${label}</button>`).join('')}</nav><main>${cards}</main>
    <script>document.querySelectorAll('button').forEach(button=>button.onclick=()=>{const mode=button.dataset.mode;document.body.className=mode;document.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===button));document.querySelectorAll('.result').forEach(img=>img.src=(mode==='blind'?'blind/':'after/')+img.dataset.id+'.png');});</script></html>`);
}
module.exports = checkThemeScenes;
