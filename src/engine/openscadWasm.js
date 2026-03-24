// src/engine/openscadWasm.js

let _wasmInstance = null;
let _initPromise = null;

const WASM_INPUT_PATH  = '/input.scad';
const WASM_OUTPUT_PATH = '/output.stl';

export async function initWasm() {
  if (_wasmInstance !== null) return _wasmInstance;
  if (_initPromise !== null) return _initPromise;

  _initPromise = (async () => {
    try {
      const { default: OpenSCAD } = await import('openscad-wasm');
      const instance = await OpenSCAD();
      _wasmInstance = instance;
      return instance;
    } catch (err) {
      _initPromise = null;
      throw new Error(`[openscadWasm] initWasm failed: ${err.message}`);
    }
  })();

  return _initPromise;
}

export async function renderScad(scadCode) {
  if (typeof scadCode !== 'string' || scadCode.trim() === '') {
    throw new Error('[openscadWasm] scadCode must be a non-empty string');
  }

  const wasm = await initWasm();

  // ✅ FIX — ensure no stale/overwrite issue
  try { wasm.FS.unlink(WASM_INPUT_PATH); } catch (_) {}

  try {
    wasm.FS.writeFile(WASM_INPUT_PATH, scadCode);
  } catch (err) {
    throw new Error(`[openscadWasm] Could not write input: ${err.message}`);
  }

  try { wasm.FS.unlink(WASM_OUTPUT_PATH); } catch (_) {}

  let exitCode;
  try {
    exitCode = wasm.callMain([WASM_INPUT_PATH, '-o', WASM_OUTPUT_PATH]);
  } catch (err) {
    throw new Error(`[openscadWasm] callMain threw: ${err.message}`);
  }

  if (exitCode !== 0) {
    throw new Error(`[openscadWasm] OpenSCAD exited with code ${exitCode}`);
  }

  let stlBytes;
  try {
    stlBytes = wasm.FS.readFile(WASM_OUTPUT_PATH);
  } catch (err) {
    throw new Error(`[openscadWasm] Could not read output STL: ${err.message}`);
  }

  if (!stlBytes || stlBytes.length === 0) {
    throw new Error('[openscadWasm] Output STL is empty');
  }

  return stlBytes; // Uint8Array
}