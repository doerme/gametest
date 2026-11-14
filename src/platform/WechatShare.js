'use strict';

const { GAME_TITLE } = require('../ui/Presentation');

function enableWechatShare(wxApi) {
  if (!wxApi) return () => {};
  const getShareMessage = () => ({
    title: GAME_TITLE + '：一起写汉字、画符打怪！'
  });
  // Register before exposing the menu so its first use has share content.
  if (typeof wxApi.onShareAppMessage === 'function') wxApi.onShareAppMessage(getShareMessage);
  if (typeof wxApi.showShareMenu === 'function') {
    wxApi.showShareMenu({
      menus: ['shareAppMessage'],
      fail: (error) => console.warn('开启好友分享失败', error)
    });
  }
  return () => {
    if (typeof wxApi.offShareAppMessage === 'function') wxApi.offShareAppMessage(getShareMessage);
  };
}

module.exports = enableWechatShare;
