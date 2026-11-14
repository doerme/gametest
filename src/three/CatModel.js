'use strict';
const THREE = require('three');

const build = require('./CatReferenceModel');
const BLINK_PERIOD = 4.2, BLINK_START = 3.8, BLINK_DURATION = 0.16;

function bind(model) {
  const head = model.getObjectByName('head');
  model.userData.catRig = {
    head, eyes: model.getObjectByName('eyes'), body: model.getObjectByName('body'), headY: head.position.y,
    pendant: model.getObjectByName('hatPendant'), ribbons: model.getObjectByName('ribbons'), cape: model.getObjectByName('cape'),
    ears: [-1, 1].map((side) => { const node = model.getObjectByName('ear' + side); return { node, rest: node.rotation.z, side }; })
  };
}

function animate(model, time, animation, drawing) {
  const rig = model.userData.catRig, hurt = animation.hurt > 0, cast = drawing || animation.cast > 0;
  const idle = animation.presentation === 'title' && !hurt && !cast;
  const breath = hurt ? 0 : Math.sin(time * 2.1);
  rig.body.scale.set(1 + breath * 0.009, 1 + breath * 0.012, 1 + breath * 0.006);
  rig.head.position.y = rig.headY + breath * 0.004;
  rig.head.rotation.z = idle ? Math.sin(time * 0.72) * THREE.MathUtils.degToRad(4) : 0;
  rig.head.rotation.x = idle ? Math.sin(time * 0.65) * 0.025 : 0;
  const phase = ((time % BLINK_PERIOD) + BLINK_PERIOD) % BLINK_PERIOD;
  const t = (phase - BLINK_START) / BLINK_DURATION;
  const blink = !hurt && !cast && t > 0 && t < 1 ? Math.sin(Math.PI * t) ** 2 : 0;
  rig.eyes.scale.y = hurt ? 0.78 : 1 - blink * 0.94;
  rig.pendant.rotation.z = hurt ? 0 : Math.sin(time * 2.6) * 0.09;
  rig.ribbons.rotation.x = Math.sin(time * 2.4) * (cast ? 0.10 : 0.035);
  rig.ribbons.rotation.z = Math.sin(time * 1.9) * 0.025;
  // The reference has a full-length cloak. It lifts backward during a cast
  // so its lower hem stays outside the ivory robe and belt.
  if (hurt) rig.cape.rotation.x = 0.02;
  else if (cast) rig.cape.rotation.x = 0.07 + Math.sin(time * 10) * 0.025;
  for (const ear of rig.ears) {
    const flickPhase = (time + (ear.side > 0 ? 0.26 : 0)) % 5.8;
    const flick = !hurt && !cast && flickPhase > 1.1 && flickPhase < 1.6 ? Math.sin((flickPhase - 1.1) / 0.5 * Math.PI * 2) * 0.065 : 0;
    ear.node.rotation.z = ear.rest + Math.sin(time * 1.6 + ear.side) * 0.018 + flick * ear.side;
  }
}

function presentationBounds(model, animateModel) {
  const result = new THREE.Box3(), box = new THREE.Box3();
  // Cache an envelope once, covering head tilt, both ears, the animated staff,
  // feet and the title's yaw range. The title then keeps a stable scale.
  for (const time of [0, 0.4, 0.8, 1.2, 1.6, 2, 2.4, 2.8, 3.2, 3.88, 4.2, 5, 6.2, 7.5, 8.5, 10]) {
    for (const cast of [0, 1]) for (const yaw of [-0.4, -0.18, 0.04]) {
      animateModel(model, time, { presentation: 'title', cast }); model.rotation.y = yaw;
      model.updateMatrixWorld(true); result.union(box.setFromObject(model));
    }
  }
  result.expandByScalar(0.035);
  animateModel(model, 0, {}); model.rotation.y = 0; model.updateMatrixWorld(true);
  return { min: result.min.toArray(), max: result.max.toArray() };
}

module.exports = { build, bind, animate, presentationBounds, BLINK_PERIOD, BLINK_START, BLINK_DURATION };
