'use strict';

function installEventTarget(target) {
  if (!target || target.__phaserWechatEventTarget) {
    return target;
  }

  const listeners = {};
  target.__phaserWechatEventTarget = true;
  target.__phaserWechatListeners = listeners;
  target.addEventListener = function addEventListener(type, listener) {
    listeners[type] = listeners[type] || [];
    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  };
  target.removeEventListener = function removeEventListener(type, listener) {
    if (!listeners[type]) {
      return;
    }
    listeners[type] = listeners[type].filter((entry) => entry !== listener);
  };
  target.dispatchEvent = function dispatchEvent(event) {
    const handlers = listeners[event.type] || [];
    event.target = event.target || target;
    event.currentTarget = target;
    for (let i = 0; i < handlers.length; i += 1) {
      handlers[i](event);
    }
    return !event.defaultPrevented;
  };
  return target;
}

function normalizeTouch(touch, index) {
  const source = touch || {};
  const x = source.clientX === undefined ? source.x : source.clientX;
  const y = source.clientY === undefined ? source.y : source.clientY;
  return {
    identifier: source.identifier === undefined ? index : source.identifier,
    clientX: x || 0,
    clientY: y || 0,
    pageX: source.pageX === undefined ? (x || 0) : source.pageX,
    pageY: source.pageY === undefined ? (y || 0) : source.pageY,
    screenX: source.screenX === undefined ? (x || 0) : source.screenX,
    screenY: source.screenY === undefined ? (y || 0) : source.screenY
  };
}

function createTouchEvent(type, event, canvas) {
  const touches = Array.prototype.map.call((event && event.touches) || [], normalizeTouch);
  const changedTouches = Array.prototype.map.call((event && event.changedTouches) || (event && event.touches) || [], normalizeTouch);
  return {
    type,
    target: canvas,
    touches,
    targetTouches: touches,
    changedTouches,
    timeStamp: Date.now(),
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {}
  };
}

function bridgeWechatTouches(wxApi, canvas) {
  if (!wxApi || !canvas || canvas.__phaserWechatTouchBridge) {
    return;
  }

  canvas.__phaserWechatTouchBridge = true;
  if (wxApi.onTouchStart) {
    wxApi.onTouchStart((event) => canvas.dispatchEvent(createTouchEvent('touchstart', event, canvas)));
  }
  if (wxApi.onTouchMove) {
    wxApi.onTouchMove((event) => canvas.dispatchEvent(createTouchEvent('touchmove', event, canvas)));
  }
  if (wxApi.onTouchEnd) {
    wxApi.onTouchEnd((event) => canvas.dispatchEvent(createTouchEvent('touchend', event, canvas)));
  }
  if (wxApi.onTouchCancel) {
    wxApi.onTouchCancel((event) => canvas.dispatchEvent(createTouchEvent('touchcancel', event, canvas)));
  }
}

function createElementFactory(wxApi, mainCanvas) {
  return function createElement(tagName) {
    const tag = String(tagName || '').toLowerCase();
    if (tag === 'canvas') {
      const canvas = wxApi && wxApi.createCanvas ? wxApi.createCanvas() : mainCanvas;
      canvas.style = canvas.style || {};
      installEventTarget(canvas);
      canvas.getBoundingClientRect = canvas.getBoundingClientRect || function getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          width: canvas.width || 0,
          height: canvas.height || 0
        };
      };
      return canvas;
    }

    if (tag === 'audio') {
      return {
        canPlayType() {
          return '';
        },
        addEventListener() {},
        removeEventListener() {},
        load() {},
        play() {},
        pause() {}
      };
    }

    if (tag === 'video') {
      return {
        canPlayType() {
          return '';
        },
        addEventListener() {},
        removeEventListener() {},
        style: {}
      };
    }

    return {
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((entry) => entry !== child);
        return child;
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 0, height: 0 };
      }
    };
  };
}

function createImageFactory(wxApi, NativeImage) {
  return function PhaserWechatImage() {
    if (wxApi && wxApi.createImage) {
      return wxApi.createImage();
    }
    if (typeof NativeImage === 'function') {
      return new NativeImage();
    }
    return {
      width: 0,
      height: 0,
      set src(_src) {
        if (this.onload) {
          this.onload();
        }
      }
    };
  };
}

function safeSet(target, key, value) {
  if (!target) {
    return;
  }
  try {
    target[key] = value;
  } catch (_error) {
    // Some WeChat runtimes expose browser-like globals as read-only getters.
  }
}

function safeSetMissing(target, key, value) {
  if (!target || target[key] !== undefined) {
    return;
  }
  safeSet(target, key, value);
}

function installWechatPhaserAdapter(options) {
  const opts = options || {};
  const wxApi = opts.wxApi || (typeof wx !== 'undefined' ? wx : null);
  const mainCanvas = opts.canvas || (wxApi && wxApi.createCanvas ? wxApi.createCanvas() : null);
  const info = opts.info || (wxApi && wxApi.getSystemInfoSync ? wxApi.getSystemInfoSync() : {});
  const width = opts.width || info.windowWidth || 375;
  const height = opts.height || info.windowHeight || 667;
  const pixelRatio = opts.pixelRatio || info.pixelRatio || 1;
  const root = typeof globalThis !== 'undefined' ? globalThis : global;

  safeSetMissing(root, 'window', root);
  const runtimeWindow = root.window || root;
  safeSet(runtimeWindow, 'window', runtimeWindow);
  safeSet(runtimeWindow, 'self', runtimeWindow);
  safeSet(runtimeWindow, 'top', runtimeWindow);
  safeSet(runtimeWindow, 'parent', runtimeWindow);
  safeSet(runtimeWindow, 'devicePixelRatio', pixelRatio);
  safeSet(runtimeWindow, 'innerWidth', width);
  safeSet(runtimeWindow, 'innerHeight', height);
  safeSet(runtimeWindow, 'orientation', 0);
  safeSetMissing(runtimeWindow, 'screen', { width, height, availWidth: width, availHeight: height });
  safeSetMissing(runtimeWindow, 'focus', function focus() {});
  safeSetMissing(runtimeWindow, 'getComputedStyle', function getComputedStyle() {
    return {
      getPropertyValue() {
        return '';
      }
    };
  });
  safeSetMissing(runtimeWindow, 'matchMedia', function matchMedia() {
    return { matches: true, addListener() {}, removeListener() {} };
  });
  safeSetMissing(runtimeWindow, 'addEventListener', function addEventListener() {});
  safeSetMissing(runtimeWindow, 'removeEventListener', function removeEventListener() {});
  safeSetMissing(runtimeWindow, 'setTimeout', setTimeout);
  safeSetMissing(runtimeWindow, 'clearTimeout', clearTimeout);
  safeSetMissing(runtimeWindow, 'setInterval', setInterval);
  safeSetMissing(runtimeWindow, 'clearInterval', clearInterval);
  safeSetMissing(runtimeWindow, 'performance', {
    now() {
      return Date.now();
    }
  });
  safeSetMissing(runtimeWindow, 'requestAnimationFrame', (
    mainCanvas && mainCanvas.requestAnimationFrame
      ? mainCanvas.requestAnimationFrame.bind(mainCanvas)
      : function requestAnimationFrame(callback) {
        return setTimeout(function tick() {
          callback(Date.now());
        }, 1000 / 60);
      }
  ));
  safeSetMissing(runtimeWindow, 'cancelAnimationFrame', function cancelAnimationFrame(id) {
    clearTimeout(id);
  });
  safeSetMissing(runtimeWindow, 'URL', {});

  safeSetMissing(root, 'navigator', {});
  const runtimeNavigator = root.navigator || {};
  safeSetMissing(runtimeNavigator, 'userAgent', 'wechat minigame');
  safeSetMissing(runtimeNavigator, 'platform', 'wechat');
  safeSetMissing(runtimeNavigator, 'maxTouchPoints', 5);
  safeSet(runtimeWindow, 'navigator', runtimeNavigator);

  safeSetMissing(root, 'document', {});
  const runtimeDocument = root.document || {};
  safeSetMissing(runtimeDocument, 'createElement', createElementFactory(wxApi, mainCanvas));
  safeSetMissing(runtimeDocument, 'createElementNS', function createElementNS(_namespace, tagName) {
    return runtimeDocument.createElement(tagName);
  });
  safeSetMissing(runtimeDocument, 'body', runtimeDocument.createElement('body'));
  safeSetMissing(runtimeDocument, 'documentElement', runtimeDocument.createElement('html'));
  safeSetMissing(runtimeDocument, 'readyState', 'complete');
  safeSetMissing(runtimeDocument, 'addEventListener', function addEventListener() {});
  safeSetMissing(runtimeDocument, 'removeEventListener', function removeEventListener() {});
  safeSetMissing(runtimeDocument, 'getElementById', function getElementById() {
    return null;
  });
  safeSetMissing(runtimeDocument, 'elementFromPoint', function elementFromPoint() {
    return mainCanvas;
  });
  safeSet(runtimeWindow, 'document', runtimeDocument);

  if (mainCanvas) {
    installEventTarget(mainCanvas);
    bridgeWechatTouches(wxApi, mainCanvas);
  }

  const NativeImage = root.Image;
  if (!root.Image || (wxApi && wxApi.createImage)) {
    safeSet(root, 'Image', createImageFactory(wxApi, NativeImage));
    safeSet(runtimeWindow, 'Image', root.Image);
  }

  safeSetMissing(root, 'HTMLCanvasElement', function HTMLCanvasElement() {});
  safeSetMissing(root, 'HTMLVideoElement', function HTMLVideoElement() {});
  safeSetMissing(root, 'HTMLAudioElement', function HTMLAudioElement() {});
  safeSetMissing(root, 'Audio', function Audio() {
    return runtimeDocument.createElement('audio');
  });
  safeSet(runtimeWindow, 'Audio', root.Audio);

  return {
    wxApi,
    canvas: mainCanvas,
    width,
    height,
    pixelRatio
  };
}

module.exports = installWechatPhaserAdapter;
