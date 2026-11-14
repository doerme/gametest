'use strict';
const THREE = require('three');

const C = {
  fur: 0xffdfae, cream: 0xfff2d9, orange: 0xefa049, pink: 0xf3a99e,
  ink: 0x253647, iris: 0x77513c, mouth: 0x9a6656, gold: 0xf1bf57,
  purple: 0x8252ad, trim: 0xffdfa0, cyan: 0x69e4ef
};
const BLINK_PERIOD = 4.2, BLINK_START = 3.8, BLINK_DURATION = 0.16;

function shapeGeometry(kit, key, makeShape, depth = 0.1) {
  return kit.geometry(key, () => {
    const geometry = new THREE.ExtrudeGeometry(makeShape(), { depth, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 6, steps: 1 });
    geometry.translate(0, 0, -depth / 2); return geometry;
  });
}

function build(factory, root) {
  const kit = factory.kit;
  const part = (parent, geometry, color, position, scale, rotation, glow) => factory.part(parent, geometry, color, position, scale, rotation, glow);
  const small = kit.geometry('cat-detail-ball', () => new THREE.SphereGeometry(1, 10, 7));
  const tiny = kit.geometry('cat-tiny-ball', () => new THREE.SphereGeometry(1, 8, 5));
  const star = kit.outline('cat-star', Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? 0.46 : 1;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  }), 0.16);
  const heart = shapeGeometry(kit, 'cat-heart', () => {
    const shape = new THREE.Shape(); shape.moveTo(0, -0.65);
    shape.bezierCurveTo(-0.28, -0.35, -0.72, -0.04, -0.62, 0.30);
    shape.bezierCurveTo(-0.53, 0.66, -0.15, 0.64, 0, 0.34);
    shape.bezierCurveTo(0.15, 0.64, 0.53, 0.66, 0.62, 0.30);
    shape.bezierCurveTo(0.72, -0.04, 0.28, -0.35, 0, -0.65); return shape;
  });

  const body = kit.group(root, 'body'); body.position.y = 0.64;
  part(body, 'ball', C.fur, [0, 0, 0], [0.405, 0.415, 0.335]);
  part(body, 'ball', C.cream, [0, -0.015, 0.265], [0.29, 0.325, 0.10]);
  part(body, 'ring', C.gold, [0, 0.36, 0], [0.30, 0.24, 0.30], [Math.PI / 2, 0, 0]);
  part(body, star, C.gold, [0, 0.34, 0.365], [0.12, 0.12, 0.40]);
  part(body, star, C.trim, [0, 0.34, 0.405], [0.065, 0.065, 0.16]);

  const head = kit.group(root, 'head'); head.position.y = 1.28;
  part(head, 'ball', C.fur, [0, 0.10, 0], [0.632, 0.455, 0.405]);
  for (const side of [-1, 1]) {
    // A few broad tufts read at phone size without a noisy hair silhouette.
    part(head, small, C.fur, [side * 0.54, -0.045, 0.04], [0.15, 0.095, 0.16], [0, 0, side * 0.17]);
    part(head, small, C.cream, [side * 0.54, -0.15, 0.08], [0.12, 0.065, 0.13], [0, 0, side * 0.20]);
    part(head, 'ball', C.cream, [side * 0.18, -0.105, 0.345], [0.245, 0.15, 0.145]);
    part(head, small, C.pink, [side * 0.405, -0.005, 0.325], [0.105, 0.052, 0.027]);
    for (let i = 0; i < 2; i += 1) {
      factory.line(head, 'cat-whisker-' + side + '-' + i, C.mouth,
        [[side * 0.39, -0.08 - i * 0.065, 0.40], [side * 0.50, -0.07 - i * 0.075, 0.36], [side * 0.59, -0.045 - i * 0.10, 0.29]], 0.008);
    }
    const ear = kit.group(head, 'ear' + side); ear.position.set(side * 0.46, 0.30, -0.025); ear.rotation.z = side * -0.12;
    const earShape = shapeGeometry(kit, 'cat-soft-ear', () => {
      const shape = new THREE.Shape(); shape.moveTo(-0.18, -0.08);
      shape.quadraticCurveTo(-0.16, 0.17, -0.025, 0.34);
      shape.quadraticCurveTo(0.015, 0.38, 0.06, 0.31);
      shape.quadraticCurveTo(0.18, 0.10, 0.18, -0.08); shape.closePath(); return shape;
    }, 0.16);
    part(ear, earShape, C.orange);
    part(ear, earShape, C.pink, [0, 0.015, 0.105], [0.58, 0.66, 0.22]);
    part(ear, small, C.cream, [0, -0.06, 0.10], [0.135, 0.07, 0.055]);
  }
  const eyes = kit.group(head, 'eyes'); eyes.position.set(0, 0.14, 0.365);
  for (const side of [-1, 1]) {
    const x = side * 0.245;
    part(eyes, 'ball', C.cream, [x, 0, 0], [0.186, 0.195, 0.065]);
    part(eyes, 'ball', C.iris, [x, -0.007, 0.055], [0.122, 0.151, 0.042]);
    part(eyes, 'ball', C.ink, [x, 0.002, 0.079], [0.105, 0.137, 0.032]);
    part(eyes, small, 0xffffff, [x - 0.032, 0.047, 0.112], [0.036, 0.045, 0.011]);
    part(eyes, tiny, 0xfff3d9, [x + 0.035, -0.046, 0.111], [0.017, 0.020, 0.009]);
  }
  part(head, heart, 0xee9b98, [0, -0.055, 0.496], [0.10, 0.075, 0.27]);
  factory.line(head, 'cat-smile', C.mouth, [[-0.113, -0.12, 0.477], [-0.062, -0.163, 0.493], [0, -0.12, 0.503], [0.062, -0.163, 0.493], [0.113, -0.12, 0.477]], 0.011);
  factory.line(head, 'cat-nose-line', C.mouth, [[0, -0.089, 0.501], [0, -0.119, 0.503]], 0.009);
  for (const side of [-1, 1]) {
    part(head, small, C.orange, [side * 0.54, 0.155, 0.205], [0.095, 0.040, 0.045], [0, side * 0.4, side * 0.16]);
    part(head, small, C.orange, [side * 0.55, 0.055, 0.225], [0.085, 0.031, 0.038]);
  }
  for (let i = 0; i < 3; i += 1) {
    part(head, small, C.orange, [0, -0.025 + i * 0.16, -0.389], [0.105 - i * 0.012, 0.042, 0.022]);
  }
  for (const x of [-0.105, 0, 0.105]) {
    part(head, small, C.orange, [x, 0.405, 0.267], [0.032, 0.075, 0.023], [0.15, 0, x * -0.8]);
  }
  part(head, 'cylinder', 0xc38b4e, [0, 0.545, 0], [0.475, 0.065, 0.395]);
  part(head, 'cylinder', 0xffe2ae, [0, 0.575, 0], [0.46, 0.055, 0.38]);
  const hat = kit.bentCone('cat-soft-hat', [[0, 0, 0, 0], [0, 0.015, 0, 0.32], [0, 0.13, 0, 0.27], [-0.025, 0.28, 0, 0.20], [-0.09, 0.43, 0, 0.13], [-0.20, 0.52, 0.015, 0.09], [-0.31, 0.52, 0.02, 0.058], [-0.37, 0.46, 0.025, 0.035], [-0.34, 0.405, 0.025, 0]]);
  part(head, hat, 0xffe4b5, [0, 0.59, 0]);
  part(head, 'cylinder', 0xb8804e, [0, 0.64, 0], [0.31, 0.07, 0.275]);
  part(head, star, C.gold, [-0.13, 0.64, 0.28], [0.068, 0.068, 0.26]);

  const cape = factory.joint(root, 'cape', [0, 1.00, -0.14], 'x', 0.07);
  const cloak = shapeGeometry(kit, 'cat-rounded-cloak', () => {
    const shape = new THREE.Shape(); shape.moveTo(-0.18, 0.10); shape.quadraticCurveTo(0, 0.17, 0.18, 0.10);
    shape.bezierCurveTo(0.33, 0.01, 0.43, -0.23, 0.53, -0.42);
    shape.quadraticCurveTo(0.44, -0.49, 0.29, -0.43); shape.quadraticCurveTo(0.15, -0.54, 0, -0.49);
    shape.quadraticCurveTo(-0.15, -0.54, -0.29, -0.43); shape.quadraticCurveTo(-0.44, -0.49, -0.53, -0.42);
    shape.bezierCurveTo(-0.43, -0.23, -0.33, 0.01, -0.18, 0.10); shape.closePath(); return shape;
  }, 0.10);
  part(cape, cloak, C.purple, [0, 0, -0.14], undefined, [0.17, 0, 0]);
  factory.line(cape, 'cat-soft-cape-gold', C.gold, [[-0.51, -0.415, -0.26], [-0.40, -0.46, -0.27], [-0.29, -0.435, -0.265], [-0.14, -0.50, -0.28], [0, -0.49, -0.28], [0.14, -0.50, -0.28], [0.29, -0.435, -0.265], [0.40, -0.46, -0.27], [0.51, -0.415, -0.26]], 0.018);
  for (const side of [-1, 1]) factory.line(cape, 'cat-cape-fold-' + side, 0x71439e, [[side * 0.15, 0.04, -0.215], [side * 0.23, -0.18, -0.25], [side * 0.27, -0.37, -0.275]], 0.015);
  const moon = shapeGeometry(kit, 'cat-crescent', () => {
    const shape = new THREE.Shape(); shape.moveTo(0.55, 0.95);
    shape.bezierCurveTo(-0.55, 1.0, -1.0, 0.45, -0.98, -0.10); shape.bezierCurveTo(-0.98, -0.85, -0.2, -1.12, 0.65, -0.88);
    shape.bezierCurveTo(-0.25, -0.75, -0.37, -0.2, -0.32, 0.2); shape.quadraticCurveTo(-0.22, 0.72, 0.55, 0.95); return shape;
  }, 0.12);
  part(cape, moon, C.trim, [-0.085, -0.18, -0.29], [0.105, 0.105, 0.25]);
  part(cape, star, C.gold, [0.15, -0.29, -0.307], [0.075, 0.075, 0.26]);
  part(cape, star, C.trim, [0.18, -0.08, -0.26], [0.030, 0.030, 0.16]);

  for (const side of [-1, 1]) {
    const leg = factory.joint(root, 'leg' + side, [side * 0.215, 0.25, 0.04], 'x', 0.23, side < 0 ? 0 : Math.PI);
    part(leg, 'ball', C.cream, [0, -0.025, 0.10], [0.225, 0.205, 0.28]);
    const pad = kit.group(leg, 'pawPad' + side); pad.position.set(0, -0.075, 0.37); pad.rotation.x = 0.30;
    part(pad, heart, C.pink, [0, -0.005, 0], [0.115, 0.095, 0.20]);
    for (const x of [-0.09, 0, 0.09]) part(pad, tiny, C.pink, [x, 0.09 - Math.abs(x) * 0.15, -0.015], [0.034, 0.044, 0.023]);
    for (const x of [-0.07, 0.07]) factory.line(leg, 'cat-toe-' + side + '-' + x, 0xd5b492, [[x, 0.07, 0.31], [x, 0.035, 0.36], [x, 0.015, 0.37]], 0.007);
  }

  const tail = factory.joint(root, 'tail', [0.18, 0.39, -0.20], 'y', 0.28);
  // Split one continuous tube into color bands. All rings share the original
  // surface positions and normals, so the stripes don't look like beads.
  const tube = kit.geometry('cat-soft-tail-surface', () => {
    const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0.30, -0.06, -0.18], [0.56, 0.04, -0.31], [0.64, 0.23, -0.34], [0.55, 0.40, -0.32], [0.42, 0.43, -0.29]].map((p) => new THREE.Vector3(...p)));
    const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false), p = geometry.attributes.position, uv = geometry.attributes.uv;
    const center = new THREE.Vector3(), offset = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = uv.getX(i), radius = 0.115 + Math.sin(t * Math.PI) * 0.035;
      curve.getPointAt(t, center); offset.fromBufferAttribute(p, i).sub(center).multiplyScalar(radius).add(center); p.setXYZ(i, offset.x, offset.y, offset.z);
    }
    geometry.computeVertexNormals(); const result = geometry.toNonIndexed(); geometry.dispose(); return result;
  });
  for (const orange of [false, true]) {
    const geometry = kit.geometry('cat-soft-tail-' + orange, () => {
      const p = [], n = [], uv = tube.attributes.uv;
      for (let i = 0; i < uv.count; i += 3) {
        const ring = Math.floor((uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3 * 40);
        const u = (ring + 0.5) / 40;
        const striped = u > 0.12 && u < 0.24 || u > 0.40 && u < 0.53 || u > 0.70 && u < 0.81;
        if (striped !== orange) continue;
        for (let j = 0; j < 3; j++) {
          const v = i + j; p.push(tube.attributes.position.getX(v), tube.attributes.position.getY(v), tube.attributes.position.getZ(v));
          n.push(tube.attributes.normal.getX(v), tube.attributes.normal.getY(v), tube.attributes.normal.getZ(v));
        }
      }
      const result = new THREE.BufferGeometry(); result.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); result.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); return result;
    });
    part(tail, geometry, orange ? C.orange : C.cream);
  }
  part(tail, small, C.cream, [0.42, 0.43, -0.29], [0.115, 0.115, 0.115]);

  for (const side of [-1, 1]) {
    const arm = factory.joint(root, side > 0 ? 'staff' : 'arm', [side * 0.355, 0.81, 0.035], 'x', 0.12, side);
    part(arm, 'ball', C.cream, [side * 0.035, -0.11, 0.12], [0.16, 0.205, 0.18]);
    for (const x of [-0.045, 0.045]) factory.line(arm, 'cat-finger-' + side + '-' + x, 0xd5b492, [[x, -0.12, 0.284], [x, -0.165, 0.272]], 0.006);
    if (side < 0) {
      part(arm, small, C.pink, [-0.035, -0.11, 0.292], [0.067, 0.065, 0.015]);
    } else {
      part(arm, 'cylinder', 0x94613c, [0.24, 0.30, 0.10], [0.044, 1.03, 0.044]);
      for (const y of [0.02, 0.10, 0.18]) part(arm, 'cylinder', C.gold, [0.24, y, 0.10], [0.054, 0.027, 0.054]);
      part(arm, 'arc', C.gold, [0.24, 0.90, 0.10], [0.18, 0.22, 0.13]);
      part(arm, star, C.gold, [0.24, 0.70, 0.145], [0.065, 0.065, 0.18]);
      part(arm, 'ball', C.cyan, [0.24, 0.90, 0.10], [0.11, 0.135, 0.10], undefined, true);
      part(arm, tiny, 0xe8ffff, [0.21, 0.94, 0.187], [0.028, 0.037, 0.014], undefined, true);
      kit.group(arm, 'castTip').position.set(0.24, 0.90, 0.10);
    }
  }
}

function bind(model) {
  const head = model.getObjectByName('head');
  model.userData.catRig = {
    head, eyes: model.getObjectByName('eyes'), body: model.getObjectByName('body'), headY: head.position.y,
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
