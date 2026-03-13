// src/utils/exportSTL.js
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";

/**
 * Export THREE.Object3D or array of Object3D to STL file
 * @param {THREE.Object3D|THREE.Object3D[]} input - Single or multiple objects
 * @param {string} filename - Name of the exported STL file
 */
export function exportToSTL(input, filename = "model.stl") {
  if (!input) {
    throw new Error("No object provided for STL export");
  }

  const exporter = new STLExporter();
  const exportGroup = new THREE.Group();

  // Normalize input to an array
  const objects = Array.isArray(input) ? input : [input];

  // Helper to process each mesh
  const processMesh = (obj) => {
    if (!obj.isMesh) return;

    obj.updateMatrixWorld(true);

    // Clone geometry and material
    const mesh = new THREE.Mesh(
      obj.geometry.clone(),
      Array.isArray(obj.material)
        ? obj.material.map((m) => m.clone())
        : obj.material.clone()
    );

    mesh.applyMatrix4(obj.matrixWorld);
    exportGroup.add(mesh);
  };

  // Traverse all objects
  objects.forEach((obj) => {
    if (!obj.isObject3D) {
      throw new Error("All input items must be THREE.Object3D");
    }
    obj.traverse(processMesh);
  });

  if (exportGroup.children.length === 0) {
    throw new Error("No meshes found to export");
  }

  // Export as binary STL
  const result = exporter.parse(exportGroup, { binary: true });
  const blob = new Blob([result], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}