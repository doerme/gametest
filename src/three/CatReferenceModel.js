'use strict';
const THREE = require('three');
const C = { fur: 0xfff3e4, orange: 0xffbd8a, pink: 0xf6adb7, nose: 0xee969e, eye: 0x65394c, pupil: 0x462b3b, iris: 0xa6667d, mouth: 0xb97385, purple: 0x9564c2, lining: 0xb496db, blue: 0xa2b7ec, blueLight: 0xc1d0fa, gold: 0xffd798, star: 0xffe28d, robe: 0xfff2d9, wood: 0xb57e58, belt: 0xa06b57 };

function shape(kit, key, make, depth = 0.08) {
  return kit.geometry(key, () => {
    const g = new THREE.ExtrudeGeometry(make(), { depth, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 1, curveSegments: 4, steps: 1 });
    g.translate(0, 0, -depth / 2); return g;
  });
}

// Closed shells give both the hat brim and the garments visible inner hems.
function shell(kit, key, columns, rows, sample) {
  return kit.geometry(key, () => {
    const p = [], indices = [], stride = columns + 1, layer = stride * (rows + 1);
    for (let inner = 0; inner < 2; inner++) for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) p.push(...sample(i / columns, j / rows, inner));
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const a = j * stride + i, b = a + 1, c = a + stride, d = c + 1;
      indices.push(a, c, b, b, c, d, a + layer, b + layer, c + layer, b + layer, d + layer, c + layer);
    }
    const edge = (a, b) => indices.push(a, b, a + layer, b, b + layer, a + layer);
    for (let i = 0; i < columns; i++) { edge(i + 1, i); edge(rows * stride + i, rows * stride + i + 1); }
    for (let j = 0; j < rows; j++) { edge(j * stride, (j + 1) * stride); edge((j + 1) * stride + columns, j * stride + columns); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
  });
}

module.exports = function build(factory, root) {
  const kit = factory.kit;
  const costume = kit.group(root, 'costumeRoot'); costume.scale.setScalar(0.955); root = costume;
  const part = (parent, geometry, color, position, scale, rotation, glow) => factory.part(parent, geometry, color, position, scale, rotation, glow);
  const small = kit.geometry('cat-ref-small', () => new THREE.SphereGeometry(1, 10, 6));
  const tiny = kit.geometry('cat-ref-tiny', () => new THREE.SphereGeometry(1, 8, 5));
  const thread = (parent, key, color, points, radius) => part(parent, kit.geometry(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 6, radius, 4, false)), color);
  const star = kit.outline('cat-ref-star', Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.47 : 1; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0.14);
  const moon = shape(kit, 'cat-ref-moon', () => {
    const s = new THREE.Shape(); s.moveTo(0.55, 0.95); s.bezierCurveTo(-0.55, 1, -1, 0.45, -0.98, -0.1); s.bezierCurveTo(-0.98, -0.85, -0.2, -1.12, 0.65, -0.88); s.bezierCurveTo(-0.25, -0.75, -0.37, -0.2, -0.32, 0.2); s.quadraticCurveTo(-0.22, 0.72, 0.55, 0.95); return s;
  });
  const wing = shape(kit, 'cat-ref-bow', () => {
    const s = new THREE.Shape(); s.moveTo(0, 0.04); s.bezierCurveTo(0.33, 0.22, 0.82, 0.61, 1.02, 0.45); s.quadraticCurveTo(1.15, 0, 0.96, -0.45); s.bezierCurveTo(0.76, -0.6, 0.31, -0.17, 0, -0.04); s.closePath(); return s;
  }, 0.24);
  const ribbon = shape(kit, 'cat-ref-ribbon', () => {
    const s = new THREE.Shape(); s.moveTo(-0.17, 0); s.quadraticCurveTo(-0.08, -0.7, -0.28, -1.2); s.lineTo(0, -1.04); s.lineTo(0.23, -1.22); s.quadraticCurveTo(0.27, -0.6, 0.17, 0); s.closePath(); return s;
  });
  const bow = (parent, p, size, turn = 0) => {
    for (const side of [-1, 1]) part(parent, wing, C.blue, [p[0] + side * size * 0.12 * Math.cos(turn), p[1], p[2] - side * size * 0.12 * Math.sin(turn)], [side * size, size, size], [0, turn, side * -0.08]);
    part(parent, small, C.blueLight, p, [size * 0.27, size * 0.34, size * 0.26]);
  };
  const robeRadius = (t) => 0.285 + 0.32 * t ** 0.8;
  const capeRadius = (t) => 0.315 + 0.39 * t ** 0.83;
  const capePoint = (a, t, inset = 0) => { const r = capeRadius(t) + inset; return [Math.sin(a) * r, 1.09 - t * 0.86 + Math.cos(a * 4) * 0.018 * t * t, Math.cos(a) * r * 0.70]; };
  // Wrap the embossed moon and stars onto the cloth, keeping them visible
  // from side and rear views without flat, floating decal planes.
  const motif = (parent, key, source, color, angle, y, size, radius, originY = 0) => {
    const g = kit.geometry(key, () => {
      const result = source.clone(), p = result.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const yy = y + p.getY(i) * size, a = angle + p.getX(i) * size / radius(yy), r = radius(yy) + 0.008 + p.getZ(i) * 0.20;
        p.setXYZ(i, Math.sin(a) * r, yy - originY, Math.cos(a) * r * 0.70);
      }
      result.computeVertexNormals(); return result;
    }); part(parent, g, color);
  };

  const body = kit.group(root, 'body'); body.position.y = 0.68;
  part(body, kit.lathe('cat-ref-robe', [[0, 0.20], [0.55, 0.20], [0.60, 0.26], [0.52, 0.46], [0.39, 0.72], [0.30, 1.04], [0.22, 1.12], [0, 1.13]]), C.robe, [0, -0.68, 0], [1, 1, 0.70]);
  for (const side of [-1, 1]) {
    const panel = (u, v, inside, cream) => {
      const a = side * ((cream ? 0.52 : 0.40) + u * (cream ? 0.72 : 1.20)), r = robeRadius(v) + (cream ? 0.035 : 0.020) - inside * 0.016;
      return [Math.sin(a) * r, 1.03 - v * 0.85 - 0.68, Math.cos(a) * r * 0.70];
    };
    part(body, shell(kit, 'cat-ref-coat-' + side, 8, 6, (u, v, inner) => panel(u, v, inner, false)), C.purple);
    part(body, shell(kit, 'cat-ref-facing-' + side, 5, 5, (u, v, inner) => panel(u, v, inner, true)), C.robe);
    for (const a of [0.42, 1.28]) factory.line(body, 'cat-ref-panel-trim-' + side + '-' + a, C.gold, Array.from({ length: 8 }, (_, i) => {
      const t = i / 7, r = robeRadius(t) + 0.042; return [side * Math.sin(a) * r, 1.03 - t * 0.85 - 0.68, Math.cos(a) * r * 0.70];
    }), 0.011);
  }
  part(body, kit.lathe('cat-ref-belt', [[0.458, 0.61], [0.465, 0.615], [0.435, 0.675], [0.428, 0.68]]), C.belt, [0, -0.68, 0], [1, 1, 0.72]);
  part(body, moon, C.gold, [0, -0.035, 0.345], [0.075, 0.075, 0.28]);
  bow(body, [0, 0.355, 0.285], 0.19); part(body, star, C.gold, [0, 0.355, 0.355], [0.105, 0.105, 0.40]);
  const ribbons = kit.group(body, 'ribbons'); ribbons.position.set(0, 0.33, 0.31);
  for (const side of [-1, 1]) part(ribbons, ribbon, C.blue, [side * 0.055, 0, 0], [0.20, 0.22, 0.20], [0, 0, side * -0.12]);
  for (const a of [-0.52, -0.26, 0, 0.26, 0.52]) motif(body, 'cat-ref-robe-star-' + a, star, C.gold, a, 0.275, 0.039, () => 0.585, 0.68);

  const head = kit.group(root, 'head'); head.position.y = 1.49;
  part(head, 'ball', C.fur, [0, 0.02, 0], [0.565, 0.375, 0.405]);
  for (const side of [-1, 1]) {
    part(head, small, C.fur, [side * 0.505, -0.13, 0.02], [0.10, 0.075, 0.12]);
    part(head, small, C.fur, [side * 0.10, -0.105, 0.35], [0.15, 0.082, 0.065]);
    part(head, small, C.pink, [side * 0.335, -0.095, 0.333], [0.065, 0.035, 0.018]);
    for (let i = 0; i < 2; i++) {
      thread(head, 'cat-ref-whisker-' + side + '-' + i, 0xc8a0b0, [[side * 0.40, -0.09 - i * 0.055, 0.315], [side * 0.49, -0.075 - i * 0.065, 0.26], [side * 0.59, -0.065 - i * 0.085, 0.21]], 0.006);
      part(head, small, C.orange, [side * 0.49, 0.015 - i * 0.095, 0.20], [0.085, 0.027, 0.020], [0, side * 0.6, side * -0.10]);
    }
    const ear = kit.group(head, 'ear' + side); ear.position.set(side * 0.40, 0.29, -0.005); ear.rotation.z = side * -0.20;
    const g = shape(kit, 'cat-ref-ear', () => { const s = new THREE.Shape(); s.moveTo(-0.16, -0.08); s.quadraticCurveTo(-0.15, 0.15, -0.04, 0.31); s.quadraticCurveTo(0, 0.36, 0.06, 0.28); s.quadraticCurveTo(0.18, 0.09, 0.16, -0.08); s.closePath(); return s; }, 0.13);
    part(ear, g, 0xffdfa9); part(ear, g, C.pink, [0, 0.005, 0.085], [0.62, 0.70, 0.22]);
  }
  const eyes = kit.group(head, 'eyes'); eyes.position.set(0, 0.055, 0.36);
  for (const side of [-1, 1]) {
    const x = side * 0.225;
    part(eyes, 'ball', C.eye, [x, 0, 0.013], [0.106, 0.132, 0.022]);
    part(eyes, small, C.pupil, [x, 0.025, 0.035], [0.078, 0.098, 0.012]);
    part(eyes, small, C.iris, [x + 0.006, -0.069, 0.041], [0.065, 0.044, 0.008]);
    part(eyes, tiny, 0xffffff, [x - 0.028, 0.045, 0.053], [0.029, 0.032, 0.007]);
    part(eyes, tiny, 0xffebec, [x + 0.030, -0.049, 0.054], [0.012, 0.014, 0.006]);
  }
  part(head, small, C.nose, [0, -0.087, 0.422], [0.034, 0.024, 0.016]);
  const mouth = shape(kit, 'cat-ref-mouth', () => { const s = new THREE.Shape(); s.moveTo(-0.076, 0); s.quadraticCurveTo(0, -0.025, 0.076, 0); s.bezierCurveTo(0.073, -0.125, -0.073, -0.125, -0.076, 0); return s; }, 0.012);
  part(head, mouth, C.mouth, [0, -0.145, 0.406]); part(head, small, 0xffb3bc, [0, -0.204, 0.420], [0.047, 0.038, 0.010]);
  factory.line(head, 'cat-ref-smile', C.mouth, [[-0.079, -0.115, 0.408], [-0.039, -0.137, 0.423], [0, -0.115, 0.428], [0.039, -0.137, 0.423], [0.079, -0.115, 0.408]], 0.008);
  factory.line(head, 'cat-ref-nose-line', C.mouth, [[0, -0.10, 0.428], [0, -0.122, 0.428]], 0.007);
  for (const x of [-0.10, 0, 0.10]) part(head, small, C.orange, [x, 0.265, 0.315], [0.029, 0.077, 0.018], [0.35, 0, x * 0.4]);

  const hat = kit.group(head, 'hat'); hat.position.set(0, 0.43, -0.025);
  const brim = (u, v, inside) => { const a = u * Math.PI * 2, r = 0.31 + v * 0.63, x = Math.sin(a) * r; return [x, -0.13 * x - Math.cos(a) * v * 0.13 + Math.sin(a * 2) * v * 0.025 - inside * 0.030, Math.cos(a) * r * 0.69]; };
  part(hat, shell(kit, 'cat-ref-brim', 40, 3, brim), C.purple);
  part(hat, shell(kit, 'cat-ref-brim-lining', 40, 2, (u, v, inside) => { const p = brim(u, v, 1); p[1] -= 0.001 + inside * 0.002; return p; }), C.lining);
  part(hat, shell(kit, 'cat-ref-brim-gold', 40, 1, (u, v, inside) => { const p = brim(u, 0.973 + v * 0.028, inside); p[0] *= 1.003; p[2] *= 1.003; p[1] += inside ? -0.003 : 0.003; return p; }), C.gold);
  part(hat, kit.bentCone('cat-ref-crown', [[0, 0, 0, 0], [0, 0.025, 0, 0.36], [0.005, 0.18, 0, 0.32], [0.025, 0.34, 0, 0.27], [0.085, 0.49, 0.01, 0.205], [0.18, 0.585, 0.015, 0.125], [0.31, 0.57, 0.02, 0.085], [0.44, 0.47, 0.025, 0.053], [0.54, 0.35, 0.03, 0.025], [0.55, 0.31, 0.03, 0]]), C.purple, undefined, [1, 0.94, 1]);
  part(hat, kit.lathe('cat-ref-hat-band', [[0.365, 0.04], [0.360, 0.065], [0.330, 0.165], [0.318, 0.18]]), C.blue);
  bow(hat, [0.18, 0.12, 0.36], 0.21); part(hat, star, C.star, [0.18, 0.12, 0.425], [0.125, 0.125, 0.40]);
  bow(hat, [0.22, 0.13, -0.355], 0.18, Math.PI);
  part(hat, moon, C.gold, [-0.08, 0.405, 0.283], [0.075, 0.075, 0.22]); part(hat, star, C.gold, [-0.23, 0.32, 0.20], [0.039, 0.039, 0.18]);
  part(hat, moon, C.gold, [0.12, 0.375, -0.255], [0.068, 0.068, 0.22], [0, Math.PI, 0]); part(hat, star, C.gold, [-0.02, 0.47, -0.21], [0.030, 0.030, 0.18]);
  const pendant = kit.group(hat, 'hatPendant'); pendant.position.set(0.55, 0.30, 0.03);
  part(pendant, tiny, C.gold, [0, -0.015, 0], [0.025, 0.035, 0.025]); factory.line(pendant, 'cat-ref-pendant-link', C.gold, [[0, -0.025, 0], [0, -0.095, 0]], 0.009); part(pendant, star, C.star, [0, -0.15, 0], [0.083, 0.083, 0.32]);

  const cape = factory.joint(root, 'cape', [0, 1.03, 0], 'x', 0.025);
  const sampleCape = (u, v, inner) => { const p = capePoint(0.72 + u * (Math.PI * 2 - 1.44), v, -inner * 0.024); p[1] -= 1.03; return p; };
  part(cape, shell(kit, 'cat-ref-cape', 28, 6, sampleCape), C.purple);
  part(cape, shell(kit, 'cat-ref-cape-hem', 28, 1, (u, v, inner) => { const p = sampleCape(u, 0.955 + v * 0.046, inner), a = 0.72 + u * (Math.PI * 2 - 1.44), offset = inner ? -0.003 : 0.003; p[0] += Math.sin(a) * offset; p[2] += Math.cos(a) * offset * 0.70; return p; }), C.gold);
  for (const side of [-1, 1]) factory.line(cape, 'cat-ref-cape-edge-' + side, C.gold, Array.from({ length: 10 }, (_, i) => { const p = capePoint(side * 0.72, i / 9, 0.006); p[1] -= 1.03; return p; }), 0.012);
  part(cape, kit.lathe('cat-ref-collar', [[0.25, 1.04], [0.30, 1.04], [0.32, 1.08], [0.29, 1.14], [0.22, 1.16], [0.19, 1.14], [0.22, 1.08], [0.25, 1.04]]), C.purple, [0, -1.03, 0.015], [1, 1, 0.82]);
  const radiusAtY = (y) => capeRadius((1.09 - y) / 0.86);
  motif(cape, 'cat-ref-cape-moon', moon, C.star, Math.PI, 0.70, 0.145, radiusAtY, 1.03);
  for (const [a, y, size] of [[2.55, 0.45, 0.060], [3.65, 0.45, 0.060], [2.15, 0.65, 0.029], [4.02, 0.58, 0.030], [3.12, 0.33, 0.055], [2.84, 0.91, 0.023]]) motif(cape, 'cat-ref-cape-star-' + a, star, C.gold, a, y, size, radiusAtY, 1.03);

  for (const side of [-1, 1]) {
    const leg = factory.joint(root, 'leg' + side, [side * 0.19, 0.145, 0.035], 'x', 0.16, side < 0 ? 0 : Math.PI);
    part(leg, small, C.fur, [0, 0, 0.07], [0.155, 0.14, 0.205]);
    for (const x of [-0.045, 0.045]) thread(leg, 'cat-ref-toe-' + side + '-' + x, 0xe6c09b, [[x, -0.035, 0.263], [x, -0.075, 0.238]], 0.006);
  }
  const tail = factory.joint(root, 'tail', [0.31, 0.32, -0.23], 'y', 0.17);
  const tube = kit.geometry('cat-ref-tail-surface', () => {
    const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0.24, -0.035, -0.12], [0.44, 0.015, -0.17], [0.57, 0.19, -0.15], [0.59, 0.36, -0.12], [0.53, 0.46, -0.09]].map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, 32, 1, 8, false), p = g.attributes.position, uv = g.attributes.uv, center = new THREE.Vector3(), point = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { const t = uv.getX(i); curve.getPointAt(t, center); point.fromBufferAttribute(p, i).sub(center).multiplyScalar(0.105 + Math.sin(t * Math.PI) * 0.025).add(center); p.setXYZ(i, point.x, point.y, point.z); }
    g.computeVertexNormals(); const result = g.toNonIndexed(); g.dispose(); return result;
  });
  for (const orange of [false, true]) {
    const g = kit.geometry('cat-ref-tail-' + orange, () => {
      const p = [], n = [], uv = tube.attributes.uv;
      for (let i = 0; i < uv.count; i += 3) {
        const u = (Math.floor((uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3 * 32) + 0.5) / 32, banded = u > 0.14 && u < 0.27 || u > 0.44 && u < 0.57 || u > 0.73 && u < 0.84;
        if (banded !== orange) continue;
        for (let j = 0; j < 3; j++) { const v = i + j; p.push(tube.attributes.position.getX(v), tube.attributes.position.getY(v), tube.attributes.position.getZ(v)); n.push(tube.attributes.normal.getX(v), tube.attributes.normal.getY(v), tube.attributes.normal.getZ(v)); }
      }
      const result = new THREE.BufferGeometry(); result.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); result.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); return result;
    }); part(tail, g, orange ? C.orange : C.fur);
  }
  part(tail, small, C.fur, [0.53, 0.46, -0.09], [0.105, 0.105, 0.105]);

  for (const side of [-1, 1]) {
    const arm = factory.joint(root, side < 0 ? 'staff' : 'arm', [side * 0.365, 0.94, 0.075], 'x', 0.09, side);
    part(arm, kit.lathe('cat-ref-sleeve', [[0, -0.27], [0.16, -0.27], [0.17, -0.22], [0.115, 0.01], [0, 0.025]]), C.robe, [side * 0.055, 0, 0.06], [1, 1, 0.9], [0, 0, side * 0.12]);
    part(arm, 'ring', C.gold, [side * 0.082, -0.235, 0.065], [0.16, 0.145, 0.16], [Math.PI / 2, 0, 0]);
    part(arm, small, C.fur, [side * 0.13, -0.205, 0.22], [0.125, 0.13, 0.12]);
    for (const x of [-0.035, 0.035]) thread(arm, 'cat-ref-finger-' + side + '-' + x, 0xe7c6b3, [[side * 0.13 + x, -0.21, 0.329], [side * 0.13 + x, -0.245, 0.316]], 0.005);
    if (side < 0) {
      part(arm, 'cylinder', C.wood, [-0.22, -0.105, 0.26], [0.035, 0.99, 0.035]);
      part(arm, kit.geometry('cat-ref-wand-ring', () => new THREE.TorusGeometry(0.165, 0.018, 5, 20)), C.gold, [-0.22, 0.51, 0.26]);
      bow(arm, [-0.22, 0.285, 0.29], 0.10);
      part(arm, star, C.gold, [-0.22, 0.51, 0.26], [0.147, 0.147, 0.46]); part(arm, star, C.star, [-0.22, 0.51, 0.303], [0.112, 0.112, 0.18], undefined, true);
      kit.group(arm, 'castTip').position.set(-0.22, 0.51, 0.303);
    }
  }
};
