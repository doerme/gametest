'use strict';

function createRuntime() {
  const wxApi = typeof wx !== 'undefined' ? wx : null;
  const info = wxApi ? wxApi.getSystemInfoSync() : {};
  const canvas = wxApi ? wxApi.createCanvas() : document.getElementById('game');
  if (!canvas) throw new Error('Game canvas is missing');
  function safe(key, value) { if (canvas[key] === undefined) { try { canvas[key] = value; } catch (_error) {} } }
  safe('style', {});
  safe('addEventListener', function () {}); safe('removeEventListener', function () {});
  const size = () => {
    const current = wxApi ? wxApi.getSystemInfoSync() : null;
    return current ? { width: current.windowWidth, height: current.windowHeight } : { width: canvas.clientWidth || 375, height: canvas.clientHeight || 667 };
  };
  return {
    wx: wxApi, canvas, pixelRatio: Math.min(info.pixelRatio || (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1), 1.5),
    getSize: size,
    createOffscreenCanvas() {
      if (wxApi) return wxApi.createCanvas(); // Only the first wx canvas is on-screen.
      return document.createElement('canvas');
    },
    createContext() {
      const attributes = { alpha: false, antialias: true, depth: true, stencil: false, preserveDrawingBuffer: false };
      for (const name of ['webgl2', 'webgl', 'experimental-webgl']) {
        try { const context = canvas.getContext(name, attributes); if (context) return context; } catch (_error) { /* Unsupported context names can throw in WeChat. */ }
      }
      throw new Error('当前设备无法创建 3D 画布，请更新微信或浏览器后重试');
    },
    raf: typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : canvas.requestAnimationFrame.bind(canvas),
    cancelRaf: typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : (id) => { if (canvas.cancelAnimationFrame) canvas.cancelAnimationFrame(id); },
    reportError(error) {
      console.error(error);
      if (wxApi && wxApi.showModal) wxApi.showModal({ title: '游戏启动失败', content: error.message, showCancel: false });
      else { const element = document.createElement('div'); element.id = 'boot-error'; element.textContent = '游戏启动失败\n' + error.message; canvas.replaceWith(element); }
    }
  };
}
module.exports = createRuntime;
