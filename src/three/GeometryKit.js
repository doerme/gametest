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

  part(parent, shape, color, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], glow = false) {
    const key = color + ':' + glow;
    if (!this.partMaterials.has(key)) {
      const material = glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
      material.userData.glow = glow;
      this.partMaterials.set(key, material);
    }
    const mesh = new THREE.Mesh(this.geometries[shape], this.partMaterials.get(key));
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

  disposeOwned(root) {
    const geometries = new Set();
    root.traverse((node) => { if (node.geometry && !node.geometry.userData.pooled) geometries.add(node.geometry); });
    geometries.forEach((geometry) => geometry.dispose());
  }

  dispose() {
    Object.values(this.geometries).forEach((geometry) => geometry.dispose());
    this.partMaterials.forEach((material) => material.dispose());
    [this.solid, this.glow, this.shadow].forEach((material) => material.dispose());
  }
}
module.exports = GeometryKit;
