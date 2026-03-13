// src/utils/scadParser.js

// ═══════════════════════════════════════════════════════════════
// SCAD → AST PARSER
//
// CONTRACT WITH ENGINE (scadEngine.js):
//   ParseSCAD(code) → ASTNode[]
//
// Every ASTNode has:
//   node.type         — "cube" | "sphere" | "cylinder" | "circle" |
//                       "square" | "polygon" | "group" | "union" |
//                       "difference" | "intersection" |
//                       "linear_extrude" | "rotate_extrude"
//
//   node.translate    — [x,y,z]   (always present, default [0,0,0])
//   node.rotate       — [x,y,z]   (always present, default [0,0,0])
//   node.scale        — [x,y,z]   (always present, default [1,1,1])
//   node.mirror       — [x,y,z]   (present when mirror() used)
//   node.color        — null | [r,g,b] | [r,g,b,a] | "cssName"
//   node.children     — ASTNode[] (for group/boolean/extrude types)
//   node.fn           — number    (segment count, from $fn)
//
// Primitive-specific fields (engine reads these):
//   cube:             node.size[3], node.center
//   sphere:           node.r
//   cylinder:         node.h, node.r1, node.r2, node.center
//   circle:           node.r
//   square:           node.size[2], node.center
//   polygon:          node.points[[x,y],...]
//   linear_extrude:   node.height, node.center, node.twist, node.fn
//   rotate_extrude:   node.angle, node.fn
// ═══════════════════════════════════════════════════════════════

// ── Default node transforms (engine expects these to always exist) ──
const DEFAULT_TRANSFORMS = () => ({
  translate: [0, 0, 0],
  rotate:    [0, 0, 0],
  scale:     [1, 1, 1],
  color:     null,
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENTRY POINT
// ═══════════════════════════════════════════════════════════════
export function ParseSCAD(code) {
  if (!code || typeof code !== "string") return [];

  // ── Strip comments ─────────────────────────────────────────
  const cleaned = code
    .replace(/\/\/.*$/gm, "")        // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .trim();

  if (!cleaned) return [];

  // ── Extract file-level variables (x = 5; arr = [1,2,3];) ───
  const vars = extractVariables(cleaned);

  // ── Remove variable assignments so they never reach parseStatement ──
  // e.g. "size = 5;" would be parsed as type="size" → null noise
  const codeWithoutVars = cleaned.replace(
    /^[a-zA-Z_$][\w$]*\s*=\s*[^;]+;/gm,
    ""
  );

  // ── Parse top-level statements ─────────────────────────────
  // globalFn: $fn from vars used as default segment count for all nodes
  const globalFn = vars["$fn"] ?? 32;
  return splitTopLevel(codeWithoutVars)
    .map((stmt) => parseStatement(stmt.trim(), vars, globalFn))
    .filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// VARIABLE EXTRACTION
// Simple numeric and array variable assignments only
// ═══════════════════════════════════════════════════════════════
function extractVariables(code) {
  const vars   = {};
  const numRe  = /^([a-zA-Z_$][\w$]*)\s*=\s*(-?[\d.]+)\s*;/gm;
  const vecRe  = /^([a-zA-Z_$][\w$]*)\s*=\s*(\[[\d.,\s-]+\])\s*;/gm;

  let m;
  while ((m = numRe.exec(code))  !== null) vars[m[1]] = parseFloat(m[2]);
  while ((m = vecRe.exec(code))  !== null) {
    const v = parseNumberArray(m[2]);
    if (v) vars[m[1]] = v;
  }
  return vars;
}

// ═══════════════════════════════════════════════════════════════
// PARSE SINGLE STATEMENT → ASTNode | null
// ═══════════════════════════════════════════════════════════════
function parseStatement(cmd, vars, globalFn = 32) {
  if (!cmd) return null;
  cmd = cmd.trim().replace(/;$/, "").trim();
  if (!cmd) return null;

  // ── Boolean / group operations ────────────────────────────
  for (const type of ["union","difference","intersection","group","hull","minkowski"]) {
    if (startsWithKeyword(cmd, type)) {
      const body = extractBraceBody(cmd, cmd.indexOf(type) + type.length);
      if (body === null) return null;
      const children = splitTopLevel(body)
        .map((s) => parseStatement(s, vars, globalFn))
        .filter(Boolean);
      // hull/minkowski → treat as union visually
      const resolvedType = (type === "hull" || type === "minkowski") ? "union" : type;
      // fn included for node uniformity — engine reads fn on all node types
      return { ...DEFAULT_TRANSFORMS(), type: resolvedType, fn: globalFn, children };
    }
  }

  // ── Transform wrappers ────────────────────────────────────
  for (const type of ["translate","rotate","scale","mirror","color","resize","multmatrix"]) {
    if (startsWithKeyword(cmd, type)) {
      return parseTransform(cmd, type, vars, globalFn);
    }
  }

  // ── Extrusions ────────────────────────────────────────────
  if (startsWithKeyword(cmd, "linear_extrude"))  return parseLinearExtrude(cmd, vars, globalFn);
  if (startsWithKeyword(cmd, "rotate_extrude"))  return parseRotateExtrude(cmd, vars, globalFn);

  // ── Primitives ────────────────────────────────────────────
  return parsePrimitive(cmd, vars, globalFn);
}

// ═══════════════════════════════════════════════════════════════
// TRANSFORM PARSER
// translate([x,y,z]) { children }  or  translate([x,y,z]) child;
// ═══════════════════════════════════════════════════════════════
function parseTransform(cmd, type, vars, globalFn = 32) {
  const paren = extractParenContent(cmd, type.length);
  if (!paren) return null;

  const afterParen = cmd.slice(type.length + paren.raw.length).trim();
  const children   = extractChildStatements(afterParen, vars, globalFn);

  const node = { ...DEFAULT_TRANSFORMS(), type: "group", fn: globalFn, children };

  switch (type) {
    case "translate":
      node.translate = resolveVec3(paren.inner, vars) ?? [0,0,0];
      break;
    case "rotate":
      node.rotate    = resolveVec3(paren.inner, vars) ?? [0,0,0];
      break;
    case "scale":
    case "resize":
      node.scale     = resolveVec3(paren.inner, vars) ?? [1,1,1];
      break;
    case "mirror":
      node.mirror    = resolveVec3(paren.inner, vars) ?? [0,0,0];
      break;
    case "color":
      node.color     = parseColorParam(paren.inner);
      break;
    case "multmatrix":
      // Not fully supported — pass through children unchanged
      break;
  }

  return node;
}

// ═══════════════════════════════════════════════════════════════
// LINEAR EXTRUDE PARSER
// linear_extrude(height=h, twist=t, center=true) { 2d }
// ═══════════════════════════════════════════════════════════════
function parseLinearExtrude(cmd, vars, globalFn = 32) {
  const paren = extractParenContent(cmd, "linear_extrude".length);
  if (!paren) return null;

  const p        = paren.inner;
  const height   = resolveParam(p, "height", vars) ?? firstNumber(p) ?? 1;
  const twist    = resolveParam(p, "twist",  vars) ?? 0;
  const scale    = resolveParam(p, "scale",  vars) ?? 1;
  const center   = /center\s*=\s*true/i.test(p);
  const fn       = resolveParam(p, "\\$fn",  vars) ?? globalFn;

  const afterParen = cmd.slice("linear_extrude".length + paren.raw.length).trim();
  const children   = extractChildStatements(afterParen, vars, globalFn);

  return {
    ...DEFAULT_TRANSFORMS(),
    type: "linear_extrude",
    height, twist, scale, center, fn,
    children,
  };
}

// ═══════════════════════════════════════════════════════════════
// ROTATE EXTRUDE PARSER
// rotate_extrude(angle=360, $fn=64) { 2d }
// ═══════════════════════════════════════════════════════════════
function parseRotateExtrude(cmd, vars, globalFn = 32) {
  const paren = extractParenContent(cmd, "rotate_extrude".length);
  if (!paren) return null;

  const p      = paren.inner;
  const angle  = resolveParam(p, "angle", vars) ?? 360;
  const fn     = resolveParam(p, "\\$fn", vars) ?? globalFn;

  const afterParen = cmd.slice("rotate_extrude".length + paren.raw.length).trim();
  const children   = extractChildStatements(afterParen, vars, globalFn);

  return {
    ...DEFAULT_TRANSFORMS(),
    type: "rotate_extrude",
    angle, fn,
    children,
  };
}

// ═══════════════════════════════════════════════════════════════
// PRIMITIVE PARSER
// cube, sphere, cylinder, circle, square, polygon
// ═══════════════════════════════════════════════════════════════
function parsePrimitive(cmd, vars, globalFn = 32) {
  const typeMatch = cmd.match(/^([a-zA-Z_$][\w$]*)/);
  if (!typeMatch) return null;

  const type  = typeMatch[1].toLowerCase();
  const paren = extractParenContent(cmd, type.length);
  const p     = paren?.inner ?? "";
  // local $fn overrides global $fn — global $fn overrides hardcoded default 32
  const fn    = resolveParam(p, "\\$fn", vars) ?? globalFn;
  const base  = { ...DEFAULT_TRANSFORMS(), type, fn };

  switch (type) {

    case "cube": {
      const vecMatch = p.match(/\[([^\]]+)\]/);
      if (vecMatch) {
        base.size = vecMatch[1].split(",").map((n) => resolveValue(n.trim(), vars) ?? 1);
      } else {
        const s   = resolveValue(p.trim(), vars) ?? firstNumber(p) ?? 1;
        base.size = [s, s, s];
      }
      base.center = /center\s*=\s*true/i.test(p);
      return base;
    }

    case "sphere": {
      base.r = resolveParam(p, "r", vars)
             ?? (resolveParam(p, "d", vars) != null ? resolveParam(p, "d", vars) / 2 : null)
             ?? firstNumber(p)
             ?? 1;
      return base;
    }

    case "cylinder": {
      // Supports: cylinder(h, r) / cylinder(h, r1, r2) / named params
      const h  = resolveParam(p, "h",  vars) ?? null;
      const r  = resolveParam(p, "r",  vars) ?? null;
      const r1 = resolveParam(p, "r1", vars) ?? null;
      const r2 = resolveParam(p, "r2", vars) ?? null;
      const d  = resolveParam(p, "d",  vars) ?? null;
      const d1 = resolveParam(p, "d1", vars) ?? null;
      const d2 = resolveParam(p, "d2", vars) ?? null;

      // Positional fallback
      const nums = extractNumbers(p);

      base.h      = h  ?? nums[0] ?? 1;
      const rTop  = r2 ?? (d2 != null ? d2/2 : null) ?? r  ?? (d != null ? d/2 : null) ?? nums[2] ?? null;
      const rBot  = r1 ?? (d1 != null ? d1/2 : null) ?? r  ?? (d != null ? d/2 : null) ?? nums[1] ?? 1;
      base.r1     = rBot;
      base.r2     = rTop ?? rBot; // if r2 not given, same as r1 → cylinder
      base.center = /center\s*=\s*true/i.test(p);
      return base;
    }

    case "circle": {
      base.r = resolveParam(p, "r", vars)
             ?? (resolveParam(p, "d", vars) != null ? resolveParam(p, "d", vars) / 2 : null)
             ?? firstNumber(p)
             ?? 1;
      return base;
    }

    case "square": {
      const vecMatch = p.match(/\[([^\]]+)\]/);
      if (vecMatch) {
        const parts = vecMatch[1].split(",").map((n) => resolveValue(n.trim(), vars) ?? 1);
        base.size   = [parts[0] ?? 1, parts[1] ?? parts[0] ?? 1];
      } else {
        const s     = firstNumber(p) ?? 1;
        base.size   = [s, s];
      }
      base.center = /center\s*=\s*true/i.test(p);
      return base;
    }

    case "polygon": {
      base.points = extractPolygonPoints(p);
      if (!base.points.length) return null;
      return base;
    }

    // Unsupported but don't crash
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

// Check if cmd starts with a keyword followed by ( or {
function startsWithKeyword(cmd, keyword) {
  return new RegExp(`^${keyword}\\s*[({]`).test(cmd);
}

// Extract brace body { ... } starting after `offset` characters
function extractBraceBody(cmd, offset) {
  const start = cmd.indexOf("{", offset);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cmd.length; i++) {
    if (cmd[i] === "{") depth++;
    if (cmd[i] === "}") { depth--; if (depth === 0) return cmd.slice(start + 1, i); }
  }
  return null;
}

// Extract content between matching parens starting at position offset
// Returns { inner: string, raw: string } or null
function extractParenContent(cmd, offset) {
  const start = cmd.indexOf("(", offset);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cmd.length; i++) {
    if (cmd[i] === "(") depth++;
    if (cmd[i] === ")") {
      depth--;
      if (depth === 0) {
        return {
          inner: cmd.slice(start + 1, i),
          raw:   cmd.slice(start, i + 1),
        };
      }
    }
  }
  return null;
}

// Parse children from the body after a transform's param list
// Body can be: "{ child1; child2; }" or "child1;" or "child1"
function extractChildStatements(bodyRaw, vars, globalFn = 32) {
  let body = bodyRaw.trim();
  if (body.startsWith("{")) {
    const inner = extractBraceBody(body, 0);
    body = inner ?? "";
  }
  return splitTopLevel(body)
    .map((s) => parseStatement(s, vars, globalFn))
    .filter(Boolean);
}

// Resolve [x,y,z] vector — supports variable names
function resolveVec3(str, vars) {
  if (!str) return null;
  const match = str.match(/\[([^[\]]*)\]/);
  if (!match) {
    // Single number → [n, n, n]
    const n = resolveValue(str.trim(), vars);
    if (n != null) return [n, n, n];
    return null;
  }
  // slice(0,3) + pad — engine expects exactly [x,y,z]
  const vec = match[1]
    .split(",")
    .slice(0, 3)
    .map((s) => resolveValue(s.trim(), vars) ?? 0);
  while (vec.length < 3) vec.push(0);
  return vec;
}

// Resolve a named parameter: "name = value" or "name = varName"
function resolveParam(params, name, vars) {
  // Capture everything up to next comma — safe for scale=[1,2,3] and arithmetic
  const re = new RegExp(`${name}\\s*=\\s*([^,]+)`);
  const m  = params.match(re);
  if (m) {
    const val = resolveValue(m[1].trim(), vars);
    if (val != null) return val;
  }
  return null;
}

// Resolve a single token or arithmetic expression
// Handles: 5, -3.14, myVar, post_h/2, base_w*2+10, etc.
function resolveValue(token, vars) {
  if (!token) return null;
  const t = token.trim();
  if (!t) return null;

  // Fast path — plain number (Number handles 5.0, .5, 05, 0.5 correctly)
  const n = Number(t);
  if (!Number.isNaN(n)) return n;

  // Fast path — plain variable name (no operators)
  if (/^[a-zA-Z_$][\w$]*$/.test(t)) {
    return vars[t] != null ? vars[t] : null;
  }

  // Expression path — substitute variables then evaluate safely
  // Only allow: digits, spaces, operators + - * / % ( ) and dots
  let expr = t;
  // Replace variable names longest-first to avoid partial replacement
  const varNames = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const name of varNames) {
    // Replace whole-word occurrences only
    expr = expr.replace(new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`, "g"), String(vars[name]));
  }

  // Safety check — after substitution only safe chars remain
  if (!/^[\d\s+\-*/%.()]+$/.test(expr)) return null;

  try {
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// Parse color() parameter: [r,g,b], [r,g,b,a], "name", 'name', or bare word
function parseColorParam(inner) {
  if (!inner) return null;
  // Array form: [r,g,b] or [r,g,b,a]
  const vec = parseNumberArray(inner);
  if (vec) return vec;
  // Quoted string: "red" or 'red'
  const quoted = inner.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1];
  // Bare CSS word: color(red) — no quotes
  const bare = inner.trim().match(/^([a-zA-Z]+)$/);
  if (bare) return bare[1];
  return null;
}

// Parse a [n,n,n,...] array of numbers
function parseNumberArray(str) {
  if (!str) return null;
  const match = str.match(/\[([^[\]]*)\]/);
  if (!match) return null;
  // handles .5, 1.0, -0.5, 10 — avoids matching lone dots
  const nums = match[1].match(/-?(?:\d*\.\d+|\d+)/g);
  if (!nums) return null;
  return nums.map(Number);
}

// Get first number from a param string
function firstNumber(str) {
  const m = str?.match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

// Get all numbers from a param string (positional args)
function extractNumbers(str) {
  if (!str) return [];
  return (str.match(/-?[\d.]+/g) ?? []).map(Number);
}

// Extract polygon points array: [[x,y], [x,y], ...]
function extractPolygonPoints(params) {
  const points = [];
  // Match points = [...] block
  const block = params.match(/points\s*=\s*(\[[\s\S]*?\])(?:\s*[,)]|$)/);
  if (!block) return points;
  const pairRe = /\[\s*(-?(?:\d*\.\d+|\d+))\s*,\s*(-?(?:\d*\.\d+|\d+))\s*\]/g;
  let m;
  while ((m = pairRe.exec(block[1])) !== null) {
    points.push([parseFloat(m[1]), parseFloat(m[2])]);
  }
  return points;
}

// ═══════════════════════════════════════════════════════════════
// SPLIT TOP-LEVEL STATEMENTS
// Respects nested {}, (), []
// Splits on ; at depth 0, or } that closes a depth-0 block
// ═══════════════════════════════════════════════════════════════
export function splitTopLevel(str) {
  if (!str?.trim()) return [];

  const parts   = [];
  let depth     = 0; // brace depth
  let pDepth    = 0; // paren depth
  let bDepth    = 0; // bracket depth
  let current   = "";

  for (let i = 0; i < str.length; i++) {
    const c = str[i];

    if (c === "{")  depth++;
    if (c === "}")  depth  = Math.max(0, depth  - 1);
    if (c === "(")  pDepth++;
    if (c === ")")  pDepth = Math.max(0, pDepth - 1);
    if (c === "[")  bDepth++;
    if (c === "]")  bDepth = Math.max(0, bDepth - 1);

    current += c;

    const atRoot = depth === 0 && pDepth === 0 && bDepth === 0;

    if (atRoot && c === ";") {
      const part = current.slice(0, -1).trim(); // remove trailing ;
      if (part) parts.push(part);
      current = "";
    } else if (atRoot && c === "}" && current.trim().length > 1) {
      const part = current.trim();
      if (part) parts.push(part);
      current = "";
    }
  }

  const leftover = current.trim();
  if (leftover) parts.push(leftover);

  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}