'use strict';

class PhaserInputAdapter {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.currentPath = [];
    this.lastCompletedPath = null;
    this.isDrawing = false;

    this.handleDown = this.handleDown.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleUp = this.handleUp.bind(this);
  }

  bind() {
    this.scene.input.on('pointerdown', this.handleDown);
    this.scene.input.on('pointermove', this.handleMove);
    this.scene.input.on('pointerup', this.handleUp);
    this.scene.input.on('pointerupoutside', this.handleUp);
  }

  destroy() {
    this.scene.input.off('pointerdown', this.handleDown);
    this.scene.input.off('pointermove', this.handleMove);
    this.scene.input.off('pointerup', this.handleUp);
    this.scene.input.off('pointerupoutside', this.handleUp);
  }

  getPoint(pointer) {
    if (!pointer) {
      return null;
    }

    return {
      x: pointer.x,
      y: pointer.y,
      t: Date.now()
    };
  }

  handleDown(pointer) {
    const point = this.getPoint(pointer);
    if (!point) {
      return;
    }

    this.isDrawing = true;
    this.currentPath = [point];
    this.lastCompletedPath = null;
  }

  handleMove(pointer) {
    if (!this.isDrawing) {
      return;
    }

    const point = this.getPoint(pointer);
    if (point) {
      this.currentPath.push(point);
    }
  }

  handleUp(pointer) {
    if (!this.isDrawing) {
      return;
    }

    const point = this.getPoint(pointer);
    if (point) {
      this.currentPath.push(point);
    }

    const completed = this.currentPath.slice();
    this.lastCompletedPath = completed;
    this.currentPath = [];
    this.isDrawing = false;

    if (completed.length <= 3) {
      this.state.handleTap(completed[0] || point);
      return;
    }

    this.state.handleGesture(completed);
  }
}

module.exports = PhaserInputAdapter;
