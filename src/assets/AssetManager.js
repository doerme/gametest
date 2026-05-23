'use strict';

class AssetManager {
  constructor(wxApi) {
    this.wx = wxApi;
    this.images = {};
    this.status = {};
  }

  loadImage(key, src) {
    const image = this.createImage();
    this.status[key] = 'loading';

    image.onload = () => {
      this.images[key] = image;
      this.status[key] = 'loaded';
    };

    image.onerror = () => {
      this.status[key] = 'error';
    };

    image.src = src;
    return image;
  }

  createImage() {
    if (this.wx && this.wx.createImage) {
      return this.wx.createImage();
    }

    if (typeof Image !== 'undefined') {
      return new Image();
    }

    return {
      set src(_src) {
        if (this.onerror) {
          this.onerror();
        }
      }
    };
  }

  getImage(key) {
    return this.status[key] === 'loaded' ? this.images[key] : null;
  }
}

module.exports = AssetManager;
