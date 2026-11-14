'use strict';
// 所有渲染器共用平台登记的游戏名称。
const GAME_TITLE = '符咒闯关';

function getSymbolIndicators(enemy) {
  if (enemy.hanzi) return [
    { type: 'hanzi', character: enemy.hanzi.character },
    { type: 'progress', completed: enemy.hanzi.strokeIndex, total: enemy.hanzi.strokeCount }
  ];
  if (enemy.symbolDisplay !== 'current-and-dots') return enemy.symbols.map((symbol) => ({ type: 'symbol', symbol }));
  if (enemy.symbols.length > 5) return [{ type: 'symbol', symbol: enemy.symbols[0] }, { type: 'count', count: enemy.symbols.length - 1 }];
  return enemy.symbols.map((symbol, i) => i === 0 ? { type: 'symbol', symbol } : { type: 'dot' });
}
module.exports = { GAME_TITLE, getSymbolIndicators };
