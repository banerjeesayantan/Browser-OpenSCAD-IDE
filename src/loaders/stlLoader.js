// src/loaders/stlLoader.js
// ─────────────────────────────────────────────────────────────────────────────
// STL binary → Three.js mesh converter
// Architecture : src/loaders/ — sits alongside other loaders
// Data flow    : renderScad() → stlBytesToMesh() → THREE.Mesh → scene.add()
// Used by      : PreviewPanel.jsx
// Exports      : stlBytesToMesh(stlBytes) — returns THREE.Mesh
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

// ── Binary STL layout constants ───────────────────────────────────────────────
const STL_HEADER_BYTES   = 80;
const STL_COUNT_OFFSET   = 80;
const STL_TRIANGLE_BYTES = 50;
const STL_MIN_SIZE       = 84;

// ── Default material color ────────────────────────────────────────────────────
const DEFAULT_COLOR = 0x1e88e5;

// ─────────────────────────────────────────────────────────────────────────────
// stlBytesToMesh
// Parse binary STL Uint8Array → THREE.Mesh ready for scene.add()
// ─────────────────────────────────────────────────────────────────────────────
export function stlBytesToMesh(stlBytes) {
  if (!(stlBytes instanceof Uint8Array)) {
    throw new Error('[stlLoader] stlBytesToMesh: expected Uint8Array');
  }
  if (stlBytes.length < STL_MIN_SIZE) {
    throw new Error('[stlLoader] STL buffer too small to be valid');
  }

  const geometry = _parseBinarySTL(stlBytes);

  // ✅ FIX — ensure valid normals (handles broken STL normals)
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  const material = new THREE.MeshPhongMaterial({
    color:       DEFAULT_COLOR,
    side:        THREE.DoubleSide,
    transparent: false,
  });

  return new THREE.Mesh(geometry, material);
}

// ─────────────────────────────────────────────────────────────────────────────
function _parseBinarySTL(bytes) {
  const view  = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(STL_COUNT_OFFSET, true);

  const expectedSize = STL_MIN_SIZE + count * STL_TRIANGLE_BYTES;
  if (bytes.length < expectedSize) {
    throw new Error(
      `[stlLoader] Buffer too small — expected ${expectedSize} bytes for ` +
      `${count} triangles, got ${bytes.length}`
    );
  }

  const positions = new Float32Array(count * 9);
  const normals   = new Float32Array(count * 9);

  let offset = STL_MIN_SIZE;

  for (let t = 0; t < count; t++) {
    const nx = view.getFloat32(offset,     true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    const base = t * 9;

    for (let v = 0; v < 3; v++) {
      const i = base + v * 3;

      const x = view.getFloat32(offset,     true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);

      // ✅ FIX — guard against NaN corruption
      positions[i]     = Number.isFinite(x) ? x : 0;
      positions[i + 1] = Number.isFinite(y) ? y : 0;
      positions[i + 2] = Number.isFinite(z) ? z : 0;

      normals[i]     = Number.isFinite(nx) ? nx : 0;
      normals[i + 1] = Number.isFinite(ny) ? ny : 0;
      normals[i + 2] = Number.isFinite(nz) ? nz : 0;

      offset += 12;
    }

    offset += 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));

  geometry.computeBoundingSphere();

  // ✅ FIX — fallback normals (final safety)
  if (!geometry.attributes.normal || geometry.attributes.normal.count === 0) {
    geometry.computeVertexNormals();
  }

  return geometry;
}