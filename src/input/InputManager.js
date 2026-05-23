'use strict';

class InputManager {
  constructor(wxApi, canvas) {
    this.wx = wxApi;
    this.canvas = canvas;
    this.currentPath = [];
    this.lastCompletedPath = null;
    this.onGesture = null;
    this.onTap = null;
    this.isDrawing = false;

    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
  }

  bind() {
    if (!this.wx) {
      return;
    }

    this.wx.onTouchStart(this.handleStart);
    this.wx.onTouchMove(this.handleMove);
    this.wx.onTouchEnd(this.handleEnd);
    if (this.wx.onTouchCancel) {
      this.wx.onTouchCancel(this.handleEnd);
    }
  }

  extractPoint(event) {
    const touch = event && event.touches && event.touches[0];
    const changed = event && event.changedTouches && event.changedTouches[0];
    const source = touch || changed;
    if (!source) {
      return null;
    }

    return {
      x: source.clientX,
      y: source.clientY,
      t: Date.now()
    };
  }

  handleStart(event) {
    const point = this.extractPoint(event);
    if (!point) {
      return;
    }

    this.isDrawing = true;
    this.currentPath = [point];
    this.lastCompletedPath = null;
  }

  handleMove(event) {
    if (!this.isDrawing) {
      return;
    }

    const point = this.extractPoint(event);
    if (point) {
      this.currentPath.push(point);
    }
  }

  handleEnd(event) {
    if (!this.isDrawing) {
      return;
    }

    const point = this.extractPoint(event);
    if (point) {
      this.currentPath.push(point);
    }

    const completed = this.currentPath.slice();
    this.lastCompletedPath = completed;
    this.currentPath = [];
    this.isDrawing = false;

    if (completed.length <= 3) {
      if (this.onTap) {
        this.onTap(completed[0] || point);
      }
      return;
    }

    if (this.onGesture) {
      this.onGesture(completed);
    }
  }
}

module.exports = InputManager;
