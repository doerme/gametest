'use strict';

const ITEM_TYPES = {
  HEALTH_POTION: 'healthPotion',
  COMBO_CHAIN: 'comboChain'
};

const ITEM_ORDER = [
  ITEM_TYPES.HEALTH_POTION,
  ITEM_TYPES.COMBO_CHAIN
];

const ITEM_SLOT_SIZE = 56;
const ITEM_SLOT_GAP = 10;
const ITEM_SLOT_LEFT = 14;
const HEART_SLOT_LEFT = 28;
const HEART_SLOT_GAP = 26;
const HEART_SLOT_BOTTOM = 28;

function getHeartSlotPosition(width, height, heartIndex) {
  return {
    x: HEART_SLOT_LEFT + heartIndex * HEART_SLOT_GAP,
    y: height - HEART_SLOT_BOTTOM
  };
}

function getItemSlots(width, height, items) {
  const inventory = items || {};
  const visibleItems = ITEM_ORDER.filter((type) => (inventory[type] || 0) > 0);
  const barHeight = visibleItems.length * ITEM_SLOT_SIZE + Math.max(0, visibleItems.length - 1) * ITEM_SLOT_GAP;
  const bottomSlotY = (height + barHeight) * 0.5 - ITEM_SLOT_SIZE;
  const slots = [];

  for (let i = 0; i < visibleItems.length; i += 1) {
    const type = visibleItems[i];
    const count = inventory[type] || 0;

    slots.push({
      type,
      count,
      x: ITEM_SLOT_LEFT,
      y: bottomSlotY - slots.length * (ITEM_SLOT_SIZE + ITEM_SLOT_GAP),
      width: ITEM_SLOT_SIZE,
      height: ITEM_SLOT_SIZE
    });
  }

  return slots;
}

function findItemAtPoint(width, height, items, point) {
  if (!point) {
    return null;
  }

  const slots = getItemSlots(width, height, items);
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (
      point.x >= slot.x &&
      point.x <= slot.x + slot.width &&
      point.y >= slot.y &&
      point.y <= slot.y + slot.height
    ) {
      return slot.type;
    }
  }

  return null;
}

module.exports = {
  ITEM_TYPES,
  getHeartSlotPosition,
  getItemSlots,
  findItemAtPoint
};
