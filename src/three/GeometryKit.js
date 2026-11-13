'use strict';
const THREE = require('three');

class GeometryKit {
  constructor() {
    this.geometries = {
      ball: new THREE.SphereGeometry(1, 16, 10),
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      cone: new THREE.ConeGeometry(1, 1, 12),
      spike: new THREE.ConeGeometry(1, 1, 4),
      ring: new THREE.TorusGeometry(1, 0.12, 6, 24),
      arc: new THREE.TorusGeometry(1, 0.13, 6, 16, Math.PI),
      tail: new THREE.TorusGeometry(1, 0.18, 6, 20, Math.PI * 1.35),
      dome: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    };
    const wing = new THREE.Shape();
    wing.moveTo(0, 0); wing.quadraticCurveTo(0.6, 0.8, 1.8, 0.3);
    wing.lineTo(1.2, -0.05); wing.lineTo(1.1, -0.3); wing.lineTo(0.65, -0.15); wing.lineTo(0.4, -0.4); wing.lineTo(0, 0);
    this.geometries.wing = new THREE.ExtrudeGeometry(wing, { depth: 0.10, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2, steps: 1, curveSegments: 8 });
    Object.values(this.geometries).forEach((g) => { g.userData.pooled = true; });
    this.solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02 });
    this.solid.name = 'SpellSolid';
    this.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.shadow = new THREE.MeshBasicMaterial({ color: 0x071323, transparent: true, opacity: 0.18, depthWrite: false });
    this.partMaterials = new Map();
  }

  group(parent, name) {
    const group = new THREE.Group();
    group.name = name || '';
    if (parent) parent.add(group);
    return group;
  }

  geometry(key, create) {
    if (!this.geometries[key]) {
      this.geometries[key] = create();
      this.geometries[key].userData.pooled = true;
    }
    return this.geometries[key];
  }

  // Closed, tapered volumes, rather than overlapping spheres, define silhouettes.
  lathe(key, profile) {
    return this.geometry(key, () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 16));
  }

  tube(key, points, radius = 0.04) {
    return this.geometry(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 12, radius, 5, false));
  }

  outline(key, points, depth = 0.12) {
    return this.geometry(key, () => {
      const shape = new THREE.Shape();
      points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 1, steps: 1, curveSegments: 6 });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    });
  }

  bentCone(key, rings) {
    return this.geometry(key, () => {
      const vertices = [], indices = [], sides = 16;
      rings.forEach(([x, y, z, radius], j) => {
        const before = rings[Math.max(0, j - 1)], after = rings[Math.min(rings.length - 1, j + 1)];
        const tangent = new THREE.Vector3(after[0] - before[0], after[1] - before[1], after[2] - before[2]).normalize();
        const u = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
        const v = new THREE.Vector3().crossVectors(u, tangent);
        for (let i = 0; i <= sides; i += 1) {
          const angle = i / sides * Math.PI * 2;
          const p = new THREE.Vector3(x, y, z).addScaledVector(u, Math.cos(angle) * radius).addScaledVector(v, Math.sin(angle) * radius);
          vertices.push(p.x, p.y, p.z);
        }
      });
      for (let j = 0; j < rings.length - 1; j += 1) for (let i = 0; i < sides; i += 1) {
        const a = j * (sides + 1) + i, b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      return geometry;
    });
  }

  part(parent, shape, color, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], glow = false) {
    const key = color + ':' + glow;
    if (!this.partMaterials.has(key)) {
      const material = glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
      material.userData.glow = glow;
      this.partMaterials.set(key, material);
    }
    const mesh = new THREE.Mesh(typeof shape === 'string' ? this.geometries[shape] : shape, this.partMaterials.get(key));
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  bake(group) {
    // Merge each joint separately, with vertex colors: one draw call per moving part.
    group.children.filter((child) => child.isGroup).forEach((child) => this.bake(child));
    for (const glowing of [false, true]) {
      const meshes = group.children.filter((child) => child.isMesh && child.material.userData.glow === glowing);
      if (!meshes.length) continue;
      const arrays = { position: [], normal: [], color: [] };
      meshes.forEach((mesh) => {
        mesh.updateMatrix();
        let geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        // Mirrored ears and other baked parts need their triangle winding reversed.
        // Object3D's negative-scale culling correction disappears after baking.
        if (mesh.matrix.determinant() < 0) {
          for (const name of Object.keys(geometry.attributes)) {
            const attribute = geometry.attributes[name];
            for (let i = 0; i < attribute.count; i += 3) for (let c = 0; c < attribute.itemSize; c += 1) {
              const a = (i + 1) * attribute.itemSize + c, b = (i + 2) * attribute.itemSize + c;
              const value = attribute.array[a]; attribute.array[a] = attribute.array[b]; attribute.array[b] = value;
            }
          }
        }
        const p = geometry.getAttribute('position');
        const n = geometry.getAttribute('normal');
        const c = mesh.material.color;
        for (let i = 0; i < p.count; i += 1) {
          arrays.position.push(p.getX(i), p.getY(i), p.getZ(i));
          arrays.normal.push(n.getX(i), n.getY(i), n.getZ(i));
          arrays.color.push(c.r, c.g, c.b);
        }
        geometry.dispose();
        group.remove(mesh);
      });
      const merged = new THREE.BufferGeometry();
      Object.keys(arrays).forEach((name) => merged.setAttribute(name, new THREE.Float32BufferAttribute(arrays[name], 3)));
      merged.computeBoundingSphere();
      group.add(new THREE.Mesh(merged, glowing ? this.glow : this.solid));
    }
    return group;
  }

  contact(parent, radius = 0.6) {
    const shadow = new THREE.Mesh(this.geometries.ball, this.shadow);
    shadow.position.y = 0.025; shadow.scale.set(radius, 0.018, radius * 0.64);
    parent.add(shadow);
    return shadow;
  }

  useCompatibleMaterial() {
    const previous = this.solid;
    // Lambert has no PBR derivatives or texture-LOD dependency on WebGL 1.
    this.solid = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.solid.name = 'SpellSolidCompatible';
    return previous;
  }

  disposeOwned(root) {
    const geometries = new Set();
    const materials = new Set();
    root.traverse((node) => {
      if (node.geometry && !node.geometry.userData.pooled) geometries.add(node.geometry);
      if (node.material && node.material.userData.themeOwned) materials.add(node.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  dispose() {
    Object.values(this.geometries).forEach((geometry) => geometry.dispose());
    this.partMaterials.forEach((material) => material.dispose());
    [this.solid, this.glow, this.shadow].forEach((material) => material.dispose());
  }
}
module.exports = GeometryKit;
