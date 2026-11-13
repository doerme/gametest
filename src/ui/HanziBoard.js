'use strict';

const { getHanziLayout } = require('./HanziLayout');
const { drawCharacter } = require('../hanzi/CanvasCharacter');
const { getStrokeMedian } = require('../hanzi/Characters');
const { resample } = require('../input/GestureRecognizer');
const { getComboMultiplier } = require('../core/GameState');

function drawHanziBoard(hud, state, input) {
  const { ctx: c, width: w, height: h } = hud;
  const { board: b, panel: p } = getHanziLayout(w, h);
  const target = state.hanziTarget;
  c.fillStyle = 'rgba(16,35,49,0.96)'; c.fillRect(p.x, p.y, p.width, p.height);
  hud.text(target ? '写一写 · ' + target.hanzi.character : '汉字描红', p.x + 15, p.y + 23, 17, '#ffe2a7', 'left', 'bold');
  hud.text(target ? '已写 ' + target.hanzi.strokeIndex + ' / ' + target.hanzi.strokeCount + ' 笔' : '等待小怪物出现', p.x + p.width - 15, p.y + 23, 12, '#bddbd0', 'right');
  if (state.feedback) {
    const text = state.feedback.text.slice(0, 28);
    hud.text(text, w / 2, p.y + 41, Math.min(10, (p.width - 26) / text.length), state.feedback.type === 'retry' ? '#f6bd9f' : '#a8dfc5', 'center');
  }
  c.fillStyle = '#f8f3e4'; c.fillRect(b.x, b.y, b.width, b.height);
  c.strokeStyle = '#d5b99a'; c.lineWidth = 1.2; c.strokeRect(b.x, b.y, b.width, b.height);
  c.save();
  if (c.setLineDash) c.setLineDash([4, 5]);
  c.strokeStyle = '#dbccba'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(b.x + b.width / 2, b.y); c.lineTo(b.x + b.width / 2, b.y + b.height);
  c.moveTo(b.x, b.y + b.height / 2); c.lineTo(b.x + b.width, b.y + b.height / 2); c.stroke(); c.restore();
  if (target) {
    const hanzi = target.hanzi;
    drawCharacter(c, hanzi.character, b.x, b.y, b.width, (index) => index < hanzi.strokeIndex ? '#278575' : index === hanzi.strokeIndex ? '#dc927a' : '#c9c9bf');
    const guide = resample(getStrokeMedian(hanzi.character, hanzi.strokeIndex), 48).map((point) => ({ x: b.x + point.x * b.width, y: b.y + point.y * b.height }));
    if (guide.length) {
      const start = guide[0];
      c.fillStyle = '#c35240'; c.strokeStyle = '#fff7dd'; c.lineWidth = 2;
      c.beginPath(); c.arc(start.x, start.y, 5, 0, Math.PI * 2); c.fill(); c.stroke();
      const a = guide[17]; const end = guide[23]; const angle = Math.atan2(end.y - a.y, end.x - a.x);
      c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#a94232';
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(end.x, end.y);
      c.moveTo(end.x - Math.cos(angle - 0.65) * 7, end.y - Math.sin(angle - 0.65) * 7); c.lineTo(end.x, end.y);
      c.lineTo(end.x - Math.cos(angle + 0.65) * 7, end.y - Math.sin(angle + 0.65) * 7); c.stroke();
      const cursor = guide[Math.floor((state.hanziGuideTime % 2) / 2 * 48)];
      c.fillStyle = '#fffbe9'; c.beginPath(); c.arc(cursor.x, cursor.y, 3.2, 0, Math.PI * 2); c.fill();
    }
  } else hud.text('等小怪物出现，再一起写字', w / 2, b.y + b.height / 2, 12, '#7b8277', 'center');

  if (state.combo > 0) {
    const x = (b.x + b.width + w - 12) / 2;
    hud.text('连击', x, b.y + 18, 10, '#bfd7ce', 'center');
    hud.text('×' + state.combo, x, b.y + 43, 20, '#ffe0a1', 'center', 'bold');
    if (state.combo >= 3) hud.text(getComboMultiplier(state.combo).toFixed(1) + '×', x, b.y + 67, 12, '#bce4d3', 'center');
  }

  // Clip the live finger trail to the paper, including canceled/rejected paths.
  const age = (Date.now() - input.completedAt) / 1000;
  const path = input.isDrawing ? input.currentPath : age < 0.28 ? input.lastCompletedPath : null;
  if (path && path.length > 1) {
    c.save(); c.beginPath(); c.rect(b.x, b.y, b.width, b.height); c.clip();
    c.globalAlpha = input.isDrawing ? 0.9 : Math.max(0, 1 - age / 0.28);
    c.strokeStyle = '#1c7974'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); path.forEach((point, index) => index ? c.lineTo(point.x, point.y) : c.moveTo(point.x, point.y)); c.stroke(); c.restore();
  }
  hud.text(state.freezeRemaining > 0 ? 'ϟ 定身中 · ' + state.freezeRemaining.toFixed(1) + ' 秒' : '从圆点起笔 · 沿箭头写完这一笔', w / 2, b.y + b.height + 19, 11, state.freezeRemaining > 0 ? '#d7c0ff' : '#c6d9ce', 'center');
}

module.exports = { drawHanziBoard };
