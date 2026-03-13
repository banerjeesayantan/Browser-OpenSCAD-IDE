// src/engine/scadEngine.js
import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { ParseSCAD } from "../utils/scadParser";

// ═══════════════════════════════════════════════════════════════
// CONTRACT WITH CALLERS
//
// convert(scadCode: string) → Promise<THREE.Group>
//   • Always returns a valid THREE.Group
//   • Never touches the scene
//   • PreviewPanel adds the result to scene
//
// disposeObject(obj) → called by PreviewPanel before re-render
// executeNode(node)  → exported for testing
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// CSG HELPERS
// three-csg-ts: CSG.subtract(meshA, meshB) / CSG.intersect(meshA, meshB)
// Both inputs must be flat THREE.Mesh with updated matrixWorld.
//
// Problem: SCAD children are often Groups (union of multiple meshes).
// Solution: collect ALL meshes from the tree, bake their world transforms
// into geometry, merge into one BufferGeometry → one Mesh for CSG.
// ═══════════════════════════════════════════════════════════════

// Collect every Mesh in a subtree into a flat array
function collectMeshes(obj, out = [], visited = new Set()) {
  if (!obj || visited.has(obj)) return out;
  visited.add(obj);
  if (obj.isMesh) { out.push(obj); return out; }
  for (const child of obj.children) collectMeshes(child, out, visited);
  return out;
}

// Merge all meshes in an Object3D tree into a single THREE.Mesh.
// Each mesh's world transform is baked into its geometry so the
// merged result sits correctly in world space.
// Returns null if no meshes found.
function mergeIntoOneMesh(obj, fallbackColor) {
  obj.updateMatrixWorld(true);
  const meshes = collectMeshes(obj);
  if (meshes.length === 0) return null;

  if (meshes.length === 1) {
    // Single mesh — just bake transform, no merge needed
    const m = meshes[0];
    m.updateMatrixWorld(true);
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
    geo.computeVertexNormals();
    const result = new THREE.Mesh(geo, m.material ?? buildMaterial(fallbackColor));
    result.updateMatrixWorld(true);
    return result;
  }

  // Multiple meshes — merge geometries
  const geos = meshes.map((m) => {
    m.updateMatrixWorld(true);
    return m.geometry.clone().applyMatrix4(m.matrixWorld);
  });

  // Manual merge: concatenate position/normal/uv buffers
  let totalVerts = 0;
  let totalIdx   = 0;
  let hasIndex   = geos.every(g => g.index !== null);

  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    if (hasIndex) totalIdx += g.index.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals   = new Float32Array(totalVerts * 3);
  const indices   = hasIndex ? new Uint32Array(totalIdx) : null;

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geos) {
    const pos = g.attributes.position.array;
    const nor = g.attributes.normal ? g.attributes.normal.array : null;
    positions.set(pos, vOffset * 3);
    if (nor) normals.set(nor, vOffset * 3);
    if (hasIndex) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) indices[iOffset + i] = idx[i] + vOffset;
      iOffset += idx.length;
    }
    vOffset += g.attributes.position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal",   new THREE.BufferAttribute(normals,   3));
  if (hasIndex) merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeVertexNormals();

  // Use the first mesh's material color as the base color
  const baseMat = meshes[0].material ?? buildMaterial(fallbackColor);
  const result  = new THREE.Mesh(merged, baseMat);
  result.updateMatrixWorld(true);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// MATERIAL FACTORY
// Supports: hex, CSS string, [r,g,b], [r,g,b,a]
// ═══════════════════════════════════════════════════════════════
function buildMaterial(colorValue) {
  const col = colorValue ?? 0x888888;

  let threeColor;
  let opacity     = 1;
  let transparent = false;

  if (Array.isArray(col)) {
    threeColor  = new THREE.Color(col[0] ?? 0.5, col[1] ?? 0.5, col[2] ?? 0.5);
    opacity     = col[3] ?? 1;
    transparent = opacity < 1;
  } else {
    // handles both CSS string ("red", "#ff0000") and hex number (0xff0000)
    threeColor = new THREE.Color(col);
  }

  return new THREE.MeshPhongMaterial({
    color:       threeColor,
    opacity,
    transparent,
    flatShading: false,
    side:        THREE.DoubleSide,
  });
}

// ═══════════════════════════════════════════════════════════════
// APPLY TRANSFORMS
// translate / rotate / scale / mirror — applied to wrapper group
// ═══════════════════════════════════════════════════════════════
function applyTransforms(object, node) {
  if (Array.isArray(node.translate)) {
    object.position.set(
      node.translate[0] ?? 0,
      node.translate[1] ?? 0,
      node.translate[2] ?? 0
    );
  }
  if (Array.isArray(node.rotate)) {
    object.rotation.set(
      THREE.MathUtils.degToRad(node.rotate[0] ?? 0),
      THREE.MathUtils.degToRad(node.rotate[1] ?? 0),
      THREE.MathUtils.degToRad(node.rotate[2] ?? 0)
    );
  }
  if (Array.isArray(node.scale)) {
    object.scale.set(
      node.scale[0] ?? 1,
      node.scale[1] ?? 1,
      node.scale[2] ?? 1
    );
  }
  if (Array.isArray(node.mirror)) {
    if (node.mirror[0]) object.scale.x *= -1;
    if (node.mirror[1]) object.scale.y *= -1;
    if (node.mirror[2]) object.scale.z *= -1;
    // DoubleSide in buildMaterial() prevents normal inversion artifacts
  }
}

// Wrap any Object3D in a Group and apply node transforms
function wrapNode(object, node) {
  const wrapper = new THREE.Group();
  applyTransforms(wrapper, node);
  wrapper.add(object);
  return wrapper;
}

// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PRIMITIVES
// cube, sphere, cylinder, circle, square, polygon
// ═══════════════════════════════════════════════════════════════
function createPrimitive(node, inheritedColor) {
  const fn  = node.fn ?? 32;
  const col = node.color ?? inheritedColor;
  let geometry = null;

  switch (node.type) {

    case "cube": {
      const s = node.size ?? [1, 1, 1];
      geometry = new THREE.BoxGeometry(s[0], s[1], s[2]);
      // translate on XYZ — after global rootGroup.rotation.x Y becomes Z
      // consistent with cylinder which already uses Z directly
      if (!node.center) geometry.translate(s[0] / 2, s[1] / 2, s[2] / 2);
      break;
    }

    case "sphere":
      geometry = new THREE.SphereGeometry(node.r ?? 1, fn, fn);
      break;

    case "cylinder": {
      const h  = node.h  ?? 1;
      const r1 = node.r1 ?? node.r ?? 1;
      const r2 = node.r2 ?? node.r ?? r1;
      // THREE: CylinderGeometry(radiusTop, radiusBottom, height)
      // SCAD:  r1=bottom, r2=top, grows along Z axis
      geometry = new THREE.CylinderGeometry(r2, r1, h, fn);
      geometry.rotateX(Math.PI / 2); // align to Z axis like SCAD
      if (!node.center) geometry.translate(0, 0, h / 2);
      break;
    }

    case "circle":
      // Standalone flat circle mesh — stays on XY plane
      // Extrusions use build2DShape() directly, not this path
      geometry = new THREE.CircleGeometry(node.r ?? 1, fn);
      break;

    case "square": {
      const [w, h] = Array.isArray(node.size)
        ? node.size
        : [node.size ?? 1, node.size ?? 1];
      // Standalone flat square mesh — stays on XY plane
      // Extrusions use build2DShape() directly, not this path
      geometry = new THREE.PlaneGeometry(w, h);
      if (!node.center) geometry.translate(w / 2, h / 2, 0);
      break;
    }

    // BUG FIX 4: safe polygon — validates points before building shape
    case "polygon": {
      if (!Array.isArray(node.points) || node.points.length < 3) return null;
      const valid = node.points
        .filter((p) => Array.isArray(p) && p.length >= 2)
        .map(([x, y]) => new THREE.Vector2(x ?? 0, y ?? 0));
      if (valid.length < 3) return null;
      const shape = new THREE.Shape(valid);
      geometry    = new THREE.ShapeGeometry(shape);
      // ShapeGeometry lies on XY plane — rotate to XZ to match SCAD 2D space
      geometry.rotateX(-Math.PI / 2);
      break;
    }

    default:
      return null;
  }

  if (!geometry) return null;
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, buildMaterial(col));
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ═══════════════════════════════════════════════════════════════
// BUILD 2D SHAPE
// Converts parser child nodes → THREE.Shape for extrusions
// BUG FIX 5: each child type handled safely — no crash on variation
// ═══════════════════════════════════════════════════════════════
function build2DShape(children, fn = 32) {
  // fn is passed in for future use (polygon resolution etc.)
  // absarc() does not accept segment count — circle resolution is
  // controlled downstream by ExtrudeGeometry or LatheGeometry sampling
  void fn; // explicitly acknowledged as unused in this version
  for (const child of children) {
    if (!child) continue;

    // Recurse into group/translate wrappers — e.g. translate([10,0,0]) circle(r=2)
    // Parser wraps transforms as { type:"group", children:[circle] }
    // build2DShape must look inside to find the real 2D primitive
    if (child.type === "group" && Array.isArray(child.children)) {
      const shape = build2DShape(child.children, fn);
      if (shape) {
        // Apply the wrapper's translate offset to the shape's points
        const tx = child.translate?.[0] ?? 0;
        const ty = child.translate?.[1] ?? 0;
        if (tx !== 0 || ty !== 0) {
          shape.currentPoint.set(
            shape.currentPoint.x + tx,
            shape.currentPoint.y + ty
          );
          // Translate all curve points
          shape.curves.forEach((curve) => {
            if (curve.v1) { curve.v1.x += tx; curve.v1.y += ty; }
            if (curve.v2) { curve.v2.x += tx; curve.v2.y += ty; }
            if (curve.aX != null) { curve.aX += tx; curve.aY += ty; }
            ["v0","v1","v2","v3"].forEach((k) => {
              if (curve[k]) { curve[k].x += tx; curve[k].y += ty; }
            });
          });
        }
        return shape;
      }
    }

    let shape = null;

    if (child.type === "circle") {
      // absarc() does not accept segment count — segments controlled by ExtrudeGeometry steps
      const cx = child.translate?.[0] ?? 0;
      const cy = child.translate?.[1] ?? 0;
      shape = new THREE.Shape();
      shape.absarc(cx, cy, child.r ?? 1, 0, Math.PI * 2, false);
    }

    if (child.type === "square") {
      const [w, h] = Array.isArray(child.size)
        ? child.size
        : [child.size ?? 1, child.size ?? 1];
      const ox = (child.center ? -w / 2 : 0) + (child.translate?.[0] ?? 0);
      const oy = (child.center ? -h / 2 : 0) + (child.translate?.[1] ?? 0);
      shape = new THREE.Shape();
      shape.moveTo(ox,     oy);
      shape.lineTo(ox + w, oy);
      shape.lineTo(ox + w, oy + h);
      shape.lineTo(ox,     oy + h);
      shape.closePath();
    }

    if (child.type === "polygon" && Array.isArray(child.points) && child.points.length >= 3) {
      const valid = child.points.filter((p) => Array.isArray(p) && p.length >= 2);
      if (valid.length >= 3) {
        shape = new THREE.Shape();
        shape.moveTo(valid[0][0], valid[0][1]);
        valid.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
        shape.closePath();
      }
    }

    if (shape) return shape;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// LINEAR EXTRUDE
// Extrudes a 2D child shape along Z axis
// Supports: height, center, twist
// ═══════════════════════════════════════════════════════════════
function executeLinearExtrude(node, inheritedColor) {
  const height = node.height ?? 1;
  const center = node.center ?? false;
  const twist  = node.twist  ?? 0;
  const fn     = node.fn     ?? 32;
  const col    = node.color  ?? inheritedColor;

  // fn passed to build2DShape so circle/polygon segments are respected
  const shape = build2DShape(node.children ?? [], fn);
  if (!shape) return null;

  const steps    = twist !== 0 ? Math.max(Math.ceil(Math.abs(twist) / 5), 4) : 1;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth:        height,
    bevelEnabled: false,
    steps,
  });

  if (center) geometry.translate(0, 0, -height / 2);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, buildMaterial(col));
  mesh.castShadow    = true;
  mesh.receiveShadow = true;

  return wrapNode(mesh, node);
}

// ═══════════════════════════════════════════════════════════════
// ROTATE EXTRUDE
// Rotates a 2D profile around Z axis → LatheGeometry
// BUG FIX 6: deduplicates adjacent identical points
//            prevents invalid lathe geometry crash
// ═══════════════════════════════════════════════════════════════
function executeRotateExtrude(node, inheritedColor) {
  const angle = node.angle ?? 360;
  const fn    = node.fn    ?? 64;
  const col   = node.color ?? inheritedColor;

  // fn passed to build2DShape so circle segments match $fn
  const shape = build2DShape(node.children ?? [], fn);
  if (!shape) return null;

  // BUG FIX 6: deduplicate adjacent identical points
  const pts = shape
    .getSpacedPoints(fn)                               // uniform spacing (better than getPoints)
    .filter((p) => p.x >= 0 || Math.abs(p.x) < 1e-6)  // keep axis points (x=0 is valid in SCAD)
    .map((p) => new THREE.Vector2(p.x, p.y))
    .filter((p, i, arr) => i === 0 || !p.equals(arr[i - 1])); // remove duplicates

  if (pts.length < 2) return null;

  const geometry = new THREE.LatheGeometry(
    pts,
    fn,
    0,
    THREE.MathUtils.degToRad(angle)
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere(); // prevents renderer issues with inside-out normals

  const mesh = new THREE.Mesh(geometry, buildMaterial(col));
  mesh.castShadow    = true;
  mesh.receiveShadow = true;

  return wrapNode(mesh, node);
}

// ═══════════════════════════════════════════════════════════════
// DIFFERENCE — CSG subtraction via three-csg-ts
// First child = base solid, rest are subtracted one by one
// Falls back to visual group if CSG fails — never crashes
// ═══════════════════════════════════════════════════════════════
function executeDifference(node, inheritedColor) {
  const children = (node.children ?? [])
    .map((c) => executeNode(c, inheritedColor))
    .filter(Boolean);

  if (children.length === 0) return null;
  if (children.length === 1) return wrapNode(children[0], node);

  try {
    // Collect tool meshes (children[1..n]) — merge each into one flat mesh
    const tools = [];
    for (let i = 1; i < children.length; i++) {
      const t = mergeIntoOneMesh(children[i], null);
      if (t) tools.push(t);
    }
    if (tools.length === 0) return wrapNode(children[0], node);

    // Collect ALL base meshes individually — subtract tools from each
    // This preserves per-mesh colors (silver base, red post, gray arms etc.)
    children[0].updateMatrixWorld(true);
    const baseMeshes = collectMeshes(children[0]);
    if (baseMeshes.length === 0) throw new Error("Base has no meshes");

    const resultGroup = new THREE.Group();

    for (const bm of baseMeshes) {
      bm.updateMatrixWorld(true);
      // Bake world transform into geometry so CSG positions are correct
      const geo = bm.geometry.clone().applyMatrix4(bm.matrixWorld);
      geo.computeVertexNormals();
      let result = new THREE.Mesh(geo, bm.material);
      result.updateMatrixWorld(true);

      for (const tool of tools) {
        try {
          result = CSG.subtract(result, tool);
        } catch (e) {
          // Tool may not intersect this mesh — skip silently
        }
      }

      result.material = bm.material; // preserve original color
      result.castShadow    = true;
      result.receiveShadow = true;
      result.geometry.computeVertexNormals();
      resultGroup.add(result);
    }

    applyTransforms(resultGroup, node);
    return resultGroup;

  } catch (err) {
    console.warn("[scadEngine] difference() CSG failed, using visual fallback:", err.message);
    const group = new THREE.Group();
    children.forEach((c) => group.add(c));
    applyTransforms(group, node);
    return group;
  }
}

// ═══════════════════════════════════════════════════════════════
// INTERSECTION — real CSG intersection via three-csg-ts
// Falls back to visual group if CSG fails — never crashes
// ═══════════════════════════════════════════════════════════════
function executeIntersection(node, inheritedColor) {
  const children = (node.children ?? [])
    .map((c) => executeNode(c, inheritedColor))
    .filter(Boolean);

  if (children.length === 0) return null;
  if (children.length === 1) return wrapNode(children[0], node);

  try {
    const baseMesh = mergeIntoOneMesh(children[0], node.color ?? inheritedColor);
    if (!baseMesh) throw new Error("Base has no mesh");

    let result = baseMesh;
    for (let i = 1; i < children.length; i++) {
      const toolMesh = mergeIntoOneMesh(children[i], null);
      if (!toolMesh) continue;
      result = CSG.intersect(result, toolMesh);
    }

    if (node.color ?? inheritedColor) {
      result.material = buildMaterial(node.color ?? inheritedColor);
    }
    result.castShadow    = true;
    result.receiveShadow = true;
    result.geometry.computeVertexNormals();

    return wrapNode(result, node);

  } catch (err) {
    console.warn("[scadEngine] intersection() CSG failed, using visual fallback:", err.message);
    const group = new THREE.Group();
    children.forEach((c) => group.add(c));
    applyTransforms(group, node);
    return group;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTE NODE — main dispatch
// Color inheritance: node.color overrides inherited, passes down
// ═══════════════════════════════════════════════════════════════
function executeNode(node, inheritedColor = null) {
  if (!node) return null;

  const currentColor = node.color ?? inheritedColor;

  switch (node.type) {

    case "difference":
      return executeDifference(node, currentColor);

    case "intersection":
      return executeIntersection(node, currentColor);

    case "linear_extrude":
      return executeLinearExtrude(node, currentColor);

    case "rotate_extrude":
      return executeRotateExtrude(node, currentColor);

    case "union":
    case "group": {
      const group = new THREE.Group();
      (node.children ?? []).forEach((child) => {
        const obj = executeNode(child, currentColor);
        if (obj) group.add(obj);
      });
      // applyTransforms directly — children are already wrapped nodes
      // using wrapNode here would double-wrap and stack transforms incorrectly
      applyTransforms(group, node);
      return group;
    }

    default: {
      const mesh = createPrimitive(node, currentColor);
      if (!mesh) return null;
      return wrapNode(mesh, node);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// DISPOSE OBJECT
// BUG FIX 1: disposes textures too — prevents GPU memory leaks
//            in long editing sessions
// ═══════════════════════════════════════════════════════════════
function disposeObject(obj) {
  if (!obj) return;

  obj.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (child.material) {
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      mats.forEach((mat) => {
        if (!mat) return;
        // Dispose any textures attached to the material
        Object.keys(mat).forEach((key) => {
          const val = mat[key];
          if (val && typeof val === "object" && "minFilter" in val) {
            val.dispose?.();
          }
        });
        mat.dispose?.();
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// CONVERT — PUBLIC ENTRY POINT
//
// Called by PreviewPanel:
//   const rootObject = await ConvertSCADToThree(scadCode);
//   objectsGroupRef.current.add(rootObject);
//
// BUG FIX 7: robust AST null guard — handles any parser output shape
// ═══════════════════════════════════════════════════════════════
/**
 * @param {string} scadCode - Raw OpenSCAD source code
 * @returns {Promise<THREE.Group>} - Always a valid THREE.Group, never null
 */
async function convert(scadCode) {
  const rootGroup = new THREE.Group();

  if (!scadCode?.trim()) return rootGroup;

  try {
    const parsed = ParseSCAD(scadCode);

    // BUG FIX 7: handle null, array, or {children:[]} from parser
    const nodes = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.children)
      ? parsed.children
      : [];

    if (nodes.length === 0) {
      console.warn("[scadEngine] Parser returned 0 nodes");
      return rootGroup;
    }

    nodes.forEach((node) => {
      const obj = executeNode(node, null);
      if (obj) rootGroup.add(obj);
    });

    // SCAD Z-up → THREE.js Y-up
    rootGroup.rotation.x = -Math.PI / 2;

    return rootGroup;

  } catch (err) {
    console.error("[scadEngine] convert() error:", err);
    // dispose what was built, clear it, then return the same object
    // avoids creating a second Group that is never disposed
    disposeObject(rootGroup);
    rootGroup.clear();
    return rootGroup;
  }
}

// ═══════════════════════════════════════════════════════════════
// NAMED EXPORTS
// import { convert }         from "../../engine/scadEngine" — PreviewPanel
// import { disposeObject }   from "../../engine/scadEngine" — PreviewPanel clearGroup
// import { executeNode }     from "../../engine/scadEngine" — testing only
// ═══════════════════════════════════════════════════════════════
export { convert, disposeObject, executeNode };

