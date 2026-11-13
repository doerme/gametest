'use strict';

class InputManager {
  constructor(wxApi, canvas, options = {}) {
    this.wx = wxApi;
    this.canvas = canvas;
    this.options = options;
    this.currentPath = [];
    this.lastCompletedPath = null;
    this.completedAt = 0;
    this.isDrawing = false;
    this.activeId = null;
    this.uiCaptured = false;
    this.gestureContext = null;
    this.gestureThreshold = 10;
    this.onGesture = null;
    this.onTap = null;
    this.bindings = [];
    ['handleStart', 'handleMove', 'handleEnd', 'cancel'].forEach((name) => { this[name] = this[name].bind(this); });
  }

  bind() {
    if (this.wx) {
      [['TouchStart', this.handleStart], ['TouchMove', this.handleMove], ['TouchEnd', this.handleEnd], ['TouchCancel', this.cancel]].forEach(([name, fn]) => {
        if (this.wx['on' + name]) {
          this.wx['on' + name](fn);
          this.bindings.push(() => { if (this.wx['off' + name]) this.wx['off' + name](fn); });
        }
      });
    } else {
      [['pointerdown', this.handleStart], ['pointermove', this.handleMove], ['pointerup', this.handleEnd], ['pointercancel', this.cancel], ['lostpointercapture', this.cancel]].forEach(([name, fn]) => {
        this.canvas.addEventListener(name, fn);
        this.bindings.push(() => this.canvas.removeEventListener(name, fn));
      });
    }
  }

  source(event, ending = false) {
    if (!event) return null;
    if (event.pointerId !== undefined) return event;
    const touches = ending ? event.changedTouches : (event.touches || event.changedTouches);
    return Array.from(touches || []).find((touch) => this.activeId === null || (touch.identifier === undefined ? 0 : touch.identifier) === this.activeId) || null;
  }

  point(source) {
    if (!source) return null;
    let x = source.clientX;
    let y = source.clientY;
    if (!this.wx && this.canvas.getBoundingClientRect) {
      const rect = this.canvas.getBoundingClientRect();
      const size = this.options.getSize ? this.options.getSize() : { width: rect.width, height: rect.height };
      x = (x - rect.left) * size.width / rect.width;
      y = (y - rect.top) * size.height / rect.height;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y, t: Date.now() };
  }

  id(source) { return source.pointerId !== undefined ? source.pointerId : (source.identifier === undefined ? 0 : source.identifier); }

  handleStart(event) {
    if (this.activeId !== null || (event.button !== undefined && event.button !== 0)) return;
    const source = this.source(event);
    const point = this.point(source);
    if (!point) return;
    this.activeId = this.id(source);
    this.uiCaptured = !!(this.options.isUiPoint && this.options.isUiPoint(point));
    this.gestureContext = !this.uiCaptured && this.options.captureGestureContext ? this.options.captureGestureContext(point) : null;
    this.gestureThreshold = this.options.getGestureThreshold ? this.options.getGestureThreshold(this.gestureContext) : 10;
    this.isDrawing = !this.uiCaptured;
    this.currentPath = [point];
    this.lastCompletedPath = null;
    if (!this.wx && this.canvas.setPointerCapture) this.canvas.setPointerCapture(this.activeId);
  }

  handleMove(event) {
    if (this.activeId === null) return;
    const source = this.source(event);
    if (!source || this.id(source) !== this.activeId) return;
    const events = source.getCoalescedEvents ? source.getCoalescedEvents() : [source];
    (events.length ? events : [source]).forEach((entry) => {
      const point = this.point(entry);
      if (point) this.currentPath.push(point);
    });
    if (this.currentPath.length > 2048) this.currentPath = this.currentPath.filter((_p, i) => i % 2 === 0 || i === this.currentPath.length - 1);
  }

  handleEnd(event) {
    if (this.activeId === null) return;
    const source = this.source(event, true);
    if (!source || this.id(source) !== this.activeId) return;
    const point = this.point(source);
    if (point) this.currentPath.push(point);
    const completed = this.currentPath.slice();
    const first = completed[0];
    const displacement = Math.max(...completed.map((p) => Math.hypot(p.x - first.x, p.y - first.y)));
    const wasUi = this.uiCaptured;
    const context = this.gestureContext;
    const threshold = this.gestureThreshold;
    this.lastCompletedPath = wasUi ? null : completed;
    this.completedAt = Date.now();
    this.cancel();
    if (displacement <= threshold) {
      if (this.onTap && (!wasUi || !this.options.isUiPoint || this.options.isUiPoint(completed[completed.length - 1]))) this.onTap(first);
    } else if (!wasUi && this.onGesture) {
      this.onGesture(completed, context);
    }
  }

  cancel(event) {
    if (event && this.activeId !== null) {
      const source = this.source(event, true);
      if (source && this.id(source) !== this.activeId) return;
      if (!source && event.changedTouches && event.changedTouches.length) return;
    }
    this.currentPath = [];
    this.isDrawing = false;
    this.uiCaptured = false;
    this.gestureContext = null;
    this.activeId = null;
  }

  destroy() { this.cancel(); this.bindings.splice(0).forEach((unbind) => unbind()); }
}
module.exports = InputManager;
