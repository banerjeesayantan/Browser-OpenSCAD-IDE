<div align="center">

# 🧊 Browser OpenSCAD IDE

### Write OpenSCAD code → See your 3D model instantly — no installation, no backend, runs 100% in your browser.

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Vercel-black?style=for-the-badge)](https://browser-open-scad-ide-5fb7-11uclsxsh-banerjeesayantans-projects.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)
[![GSoC](https://img.shields.io/badge/GSoC-2025-orange?style=for-the-badge)](https://summerofcode.withgoogle.com/)
[![Made With](https://img.shields.io/badge/Made%20With-React%20%2B%20Three.js-61DAFB?style=for-the-badge)](https://threejs.org/)

<br/>

> **Built as a GSoC 2026 proof-of-concept** — A fully client-side OpenSCAD IDE that converts SCAD code into interactive 3D models using Three.js, with zero backend required.

</div>

---

## 🎬 Live Demo

<div align="center">

![Demo](https://github.com/user-attachments/assets/4c6b46ad-f538-4243-afc2-d550bbfb8fde)

**👉 [Try the live demo on Vercel](https://browser-open-scad-ide-5fb7-11uclsxsh-banerjeesayantans-projects.vercel.app)**

</div>

---

## 📸 Screenshots

<div align="center">

### 🖊️ Editor + 3D Preview
<img width="1366" height="438" alt="Editor and Preview" src="https://github.com/user-attachments/assets/8b85f54d-83f1-45dc-a1e6-6fead70cea98" />

### 🔍 Top Section — URL Fetcher + Controls
<img width="601" height="75" alt="Top Section" src="https://github.com/user-attachments/assets/d1edd334-3c6e-4798-8b34-dcae17defd55" />

### 🖥️ Terminal — Real-time Logs
<img width="622" height="207" alt="Terminal" src="https://github.com/user-attachments/assets/42285026-a937-47e8-b78d-2494be33167a" />

</div>
---

## 📌 Table of Contents

- [What Is This?](#-what-is-this)
- [Problem It Solves](#-problem-it-solves)
- [Features](#-features)
- [How To Use](#-how-to-use)
- [Install Locally](#-install-locally)
- [Supported SCAD Features](#-supported-scad-features)
- [How It Works — Engineering](#-how-it-works--engineering)
- [Architecture](#-architecture)
- [Project Vision & Mission](#-project-vision--mission)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧊 What Is This?

**Browser OpenSCAD IDE** is a fully client-side web application that lets you:

- ✍️ Write [OpenSCAD](https://openscad.org/) code in a professional Monaco editor
- 🎯 Press **Run** and see your 3D model rendered instantly using [Three.js](https://threejs.org/)
- 🌐 Fetch any `.scad` file from a GitHub URL — it auto-loads and renders
- 📁 Upload local `.scad` files directly
- 💾 Export your model as an `.stl` file for 3D printing

**No installation. No backend. No OpenSCAD binary required.**

Just open the URL and start designing. Everything runs entirely in your browser.

---

## 🔥 Problem It Solves

OpenSCAD is a powerful parametric 3D modeling tool — but it has a major friction problem:

| Problem | This Project's Solution |
|---|---|
| Requires desktop installation | Runs 100% in the browser — zero install |
| No online editor with real 3D preview | Full Monaco editor + Three.js 3D renderer |
| Sharing models requires file transfers | Paste any GitHub URL → instant render |
| High learning curve with slow feedback | Write code → see result in milliseconds |
| CSG operations need native binary | Implemented via `three-csg-ts` in browser |
| Colors lost in boolean operations | Per-mesh color preservation in difference() |
| CORS blocks external file fetches | Automatic CORS proxy fallback built-in |

---

## ✨ Features

### 🖊️ Editor
- **Monaco Editor** — the same editor that powers VS Code
- **SCAD Syntax Highlighting** — keywords, numbers, strings, comments all colored
- **Minimap** — code overview panel on the right
- **Auto-save** — code saved to `localStorage` on every keystroke
- **Restore on Refresh** — reloads your last code automatically
- **Paste / Copy / Clear** buttons in header

### 🎯 3D Preview
- **Real-time Three.js rendering** — interactive 3D scene
- **Orbit Controls** — rotate, zoom, pan with mouse
- **Axis Helper** — X/Y/Z orientation lines always visible
- **Grid** — ground plane reference
- **Zoom In / Out / Reset** buttons
- **Auto-fit camera** — fits view to rendered model automatically

### 🔧 CSG Operations
- **`difference()`** — subtract shapes with full color preservation
- **`union()`** — combine multiple shapes
- **`intersection()`** — keep only overlapping volume
- **Per-mesh color preservation** — each part keeps its own color after CSG

### 🌈 Color Support
- `color("red")` — CSS named colors
- `color("#ff0000")` — hex colors
- `color([r, g, b])` — RGB array (0–1 range)
- `color([r, g, b, a])` — RGBA with transparency
- Color inheritance — nested children inherit parent color

### 🌐 URL Fetcher
- Paste any GitHub `.scad` URL — **blob or raw format both work**
- Auto-converts `github.com/blob/` → `raw.githubusercontent.com`
- **CORS proxy fallback** — if direct fetch is blocked, retries via `corsproxy.io`
- Fetched code loads into editor AND renders in 3D
- Press **Enter** in URL box to trigger Run

### 📁 File Upload
- Click **Upload** → select any `.scad` file
- Loads into editor and renders immediately
- Clears URL box automatically

### 💾 Download / Export
- **Download SCAD** — saves your source code as `model.scad`
- **Export STL** — exports the 3D mesh as `model.stl` for 3D printing

### 📐 Resizable Panels
- Drag the divider between editor and preview to resize
- Drag the divider between preview and terminal to resize
- Uses `ResizeObserver` — panels never disappear on window resize

### 🖥️ Terminal
- Real-time logs — fetch status, parse status, render status
- Color-coded: green = success, red = error, yellow = warning
- **Clear** button to reset logs
- Shows timestamps for every event

---

## 📖 How To Use

### 1. Write SCAD Code

Type any valid OpenSCAD code in the left editor panel:

```scad
$fn = 48;

difference() {
  color("steelblue")
  cube([20, 20, 20], center=true);

  color("red")
  sphere(r=12);
}
```

Press **Run** → your 3D model renders instantly.

---

### 2. Load from a GitHub URL

Paste any `.scad` file URL from GitHub into the search bar at the top:

```
https://github.com/banerjeesayantan/Test/blob/main/model.scad
```

> ✅ Both GitHub blob URLs and raw URLs are supported — auto-converted automatically.

Press **Run** (or press **Enter**) → file fetches → code loads in editor → 3D renders.

---

### 3. Upload a Local File

Click **Upload** → select any `.scad` file from your computer → renders immediately.

---

### 4. Navigate the 3D Preview

| Action | Control |
|---|---|
| Rotate / Orbit | Left click + drag |
| Zoom | Scroll wheel |
| Pan | Right click + drag |
| Reset camera | Click **Reset** button |
| Zoom in | Click **+** button |
| Zoom out | Click **−** button |

---

### 5. Download Your Model

Click **Download** → saves:
- `model.scad` — your OpenSCAD source code
- `model.stl` — the 3D mesh ready for printing or CAD tools

---

### 6. Keyboard Shortcuts (in Editor)

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+A` | Select all |
| `Ctrl+C` | Copy selection |
| `Ctrl+V` | Paste |
| `Ctrl+X` | Cut |
| `F1` | Command palette |

---

## ⚡ Install Locally

### Prerequisites
- **Node.js** 18 or higher → [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** → [Download](https://git-scm.com/)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/banerjeesayantan/Browser-OpenSCAD-IDE.git
cd Browser-OpenSCAD-IDE
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 4 — Build for Production

```bash
npm run build
```

Output goes to `dist/` folder — ready to deploy anywhere.

### Step 5 — Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel (One Command)

```bash
npx vercel --prod
```

### Deploy to Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

---

## ✅ Supported SCAD Features

### 3D Primitives

| Feature | Syntax | Status |
|---|---|---|
| Box / Cube | `cube([w, h, d])` | ✅ |
| Sphere | `sphere(r)` | ✅ |
| Cylinder / Cone | `cylinder(h, r, r1, r2)` | ✅ |

### 2D Primitives (for extrusion)

| Feature | Syntax | Status |
|---|---|---|
| Circle | `circle(r)` | ✅ |
| Square | `square([w, h])` | ✅ |
| Polygon | `polygon(points)` | ✅ |

### Transforms

| Feature | Syntax | Status |
|---|---|---|
| Translate | `translate([x, y, z])` | ✅ |
| Rotate | `rotate([x, y, z])` | ✅ |
| Scale | `scale([x, y, z])` | ✅ |
| Mirror | `mirror([x, y, z])` | ✅ |
| Color | `color("name")` | ✅ |

### Boolean (CSG) Operations

| Feature | Syntax | Status |
|---|---|---|
| Union | `union() { }` | ✅ |
| Difference | `difference() { }` | ✅ |
| Intersection | `intersection() { }` | ✅ |

### Extrusions

| Feature | Syntax | Status |
|---|---|---|
| Linear Extrude | `linear_extrude(height)` | ✅ |
| Rotate Extrude | `rotate_extrude(angle)` | ✅ |

### Variables & Expressions

| Feature | Example | Status |
|---|---|---|
| Variables | `x = 10;` | ✅ |
| Arithmetic | `translate([x+5, y*2, 0])` | ✅ |
| Global `$fn` | `$fn = 48;` | ✅ |
| Named params | `cylinder(h=10, r=5)` | ✅ |

### Not Yet Supported

| Feature | Status |
|---|---|
| `for` loops | 🔄 Phase 2 |
| `module` definitions | 🔄 Phase 2 |
| `function` definitions | 🔄 Phase 2 |
| `if` / `else` | 🔄 Phase 2 |
| `hull()` | 🔄 Phase 2 |
| `minkowski()` | 🔄 Phase 2 |
| `import()` | 🔄 Phase 3 |
| `text()` | 🔄 Phase 3 |

---

## 🔧 How It Works — Engineering

### The Core Problem

OpenSCAD is a compiled language — normally it requires a native binary to convert code into geometry. This project reimplements the core language in JavaScript, running entirely in the browser.

### Step 1 — Parsing (`scadParser.js`)

The parser converts raw SCAD text into an **Abstract Syntax Tree (AST)**:

```
Input:  "translate([0,0,10]) color("red") cylinder(h=20, r=5);"
                          │
                          ▼
Output: {
  type: "group",
  translate: [0, 0, 10],
  color: null,
  children: [{
    type: "group",
    color: "red",
    children: [{
      type: "cylinder",
      h: 20, r1: 5, r2: 5,
      color: null
    }]
  }]
}
```

Key parser capabilities:
- **Recursive descent** — handles arbitrarily deep nesting
- **Variable resolution** — `x = 10; cube([x, x, x])` evaluates correctly
- **Expression evaluator** — `translate([10+5, 20/2, 0])` computes at parse time
- **`$fn` propagation** — global segment count inherited by all children
- **Named + positional parameters** — both `cylinder(10, 5)` and `cylinder(h=10, r=5)` work

### Step 2 — Engine (`scadEngine.js`)

The engine walks the AST and builds a Three.js scene graph:

```
executeNode(node, inheritedColor)
    │
    ├── "cube"          → THREE.BoxGeometry
    ├── "sphere"        → THREE.SphereGeometry
    ├── "cylinder"      → THREE.CylinderGeometry (rotated to Z-axis)
    ├── "circle"        → THREE.CircleGeometry
    ├── "square"        → THREE.PlaneGeometry
    ├── "polygon"       → THREE.ShapeGeometry
    ├── "group"         → THREE.Group + applyTransforms()
    ├── "union"         → THREE.Group (children merged visually)
    ├── "difference"    → CSG.subtract() per mesh + color preserved ✅
    ├── "intersection"  → CSG.intersect() per mesh
    ├── "linear_extrude"→ THREE.ExtrudeGeometry
    └── "rotate_extrude"→ THREE.LatheGeometry
```

### Step 3 — CSG Color Preservation (Hardest Problem)

**The problem:** Standard CSG merges all base meshes into one → loses per-mesh colors.

**Example:** `difference()` with a `union()` containing red post + silver base + gray arms:
- Naive approach: merge everything → one gray mesh, all colors lost ❌
- Our approach: subtract tools from each mesh individually → colors preserved ✅

```javascript
// For each individual mesh in the base union:
for (const baseMesh of collectMeshes(children[0])) {
  let result = baseMesh; // red post stays red, silver base stays silver
  for (const tool of tools) {
    result = CSG.subtract(result, tool); // hole cut from this mesh
  }
  resultGroup.add(result); // original color preserved ✅
}
```

### Step 4 — Coordinate System

OpenSCAD uses **Z-up** coordinates. Three.js uses **Y-up**. The engine fixes this:

```javascript
rootGroup.rotation.x = -Math.PI / 2; // rotate entire scene Z-up → Y-up
```

Cylinder geometry is also rotated to align with the Z-axis:
```javascript
geometry.rotateX(Math.PI / 2); // CylinderGeometry grows along Y → rotate to Z
```

### Step 5 — URL Fetcher with CORS Proxy

```javascript
// Try direct fetch first
const res = await fetch(directUrl);
// If blocked → auto-retry via CORS proxy
const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(directUrl)}`);
```

GitHub blob URLs are auto-converted:
```javascript
url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
```

---

## 🏗️ Architecture

### Full System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                      App.jsx                         │   │
│  │                                                      │   │
│  │  State: scadCode, runTrigger, logs, urlInput         │   │
│  │  Refs:  fetchController, previewObjectRef            │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                         │
│      ┌────────────┴──────────────┐                          │
│      ▼                           ▼                          │
│  ┌──────────────┐    ┌───────────────────────────────┐      │
│  │  TopSection  │    │         LowerLayer            │      │
│  │              │    │                               │      │
│  │  [URL Input] │    │  ┌──────────┬────────────┐    │      │
│  │  [Run]       │    │  │  Editor  │  Preview   │    │      │
│  │  [Upload]    │    │  │  Panel   │  Panel     │    │      │
│  │  [Download]  │    │  └──────────┴────────────┘    │      │
│  └──────────────┘    │  └─────── Terminal ──────────┘│      │
│                      └───────────────────────────────┘      │
│                                    │                        │
│                          ┌─────────┘                        │
│                          ▼                                  │
│                   ┌─────────────┐                           │
│                   │ scadEngine  │                           │
│                   │    .js      │                           │
│                   └──────┬──────┘                           │
│                          │                                  │
│           ┌──────────────┼──────────────┐                   │
│           ▼              ▼              ▼                   │
│    ┌────────────┐  ┌──────────┐  ┌──────────┐               │
│    │scadParser  │  │three-csg │  │ Three.js │               │
│    │  .js       │  │   -ts    │  │  Scene   │               │
│    │(SCAD→AST)  │  │  (CSG)   │  │          │               │
│    └────────────┘  └──────────┘  └──────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User types SCAD code
        │
        ▼
setScadCode() ──────────────→ localStorage (auto-saved)
        │
        ▼
User presses Run
        │
        ▼
App.handleRun()
        │
        ├─ URL in box? ──→ fetch(url)
        │                      │
        │                      ├─ Direct fetch OK? ──→ use response
        │                      └─ Blocked? ──→ corsproxy.io fallback
        │                              │
        │                              ▼
        │                    setScadCode(fetchedCode)
        │                    setUrlInput("") ← clear URL box
        │
        ▼
setRunTrigger++ ──→ PreviewPanel useEffect fires
        │
        ▼
scadParser.ParseSCAD(code) ──→ AST []
        │
        ▼
scadEngine.executeNode(node) ──→ THREE.Group
        │
        ▼
scene.add(rootGroup) ──→ Three.js renders 3D ✅
        │
        ▼
onObjectReady(obj) ──→ previewObjectRef (used for STL export)
```

### File Structure

```
Browser-OpenSCAD-IDE/
│
├── src/
│   ├── App.jsx                          ← Root: state, URL fetch, run logic
│   ├── main.jsx                         ← React entry point
│   ├── index.css                        ← Global styles
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopSection.jsx           ← Header: URL bar, Run, Upload, Download
│   │   │   └── LowerLayer.jsx           ← Resizable panel layout
│   │   │
│   │   ├── editor/
│   │   │   └── EditorPanel.jsx          ← Monaco editor + SCAD syntax theme
│   │   │
│   │   ├── preview/
│   │   │   └── PreviewPanel.jsx         ← Three.js scene, camera, controls
│   │   │
│   │   └── terminal/
│   │       └── TerminalPanel.jsx        ← Log output panel
│   │
│   ├── engine/
│   │   └── scadEngine.js               ← AST → Three.js geometry converter
│   │
│   └── utils/
│       ├── scadParser.js               ← SCAD text → AST parser
│       └── stlExport.js                ← Three.js mesh → STL file
│
├── demo/
│   ├── demo.gif                        ← Animated demo (embed in README)
│   ├── screenshot-editor.png
│   ├── screenshot-colors.png
│   ├── screenshot-url-fetch.png
│   └── screenshot-assembly.png
│
├── index.html                          ← HTML entry point
├── vite.config.js                      ← Vite build config
├── package.json                        ← Dependencies
├── README.md                           ← This file
└── LICENSE                             ← MIT
```

### Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | 18+ | UI framework |
| `three` | latest | 3D rendering engine |
| `three-csg-ts` | latest | CSG boolean operations |
| `@monaco-editor/react` | latest | Code editor |
| `react-resizable` | latest | Resizable panels |
| `@vitejs/plugin-react` | latest | Vite + React |
| `tailwindcss` | latest | Styling |

---

## 🌍 Project Vision & Mission

### Vision
A world where anyone can design 3D models using OpenSCAD — directly in their browser, with zero setup, from any device, anywhere in the world.

### Mission
Build the best browser-based OpenSCAD IDE — fast, accurate, open source, and accessible to complete beginners and expert engineers alike.

### The Story
OpenSCAD is loved by the maker community for parametric 3D design — but its desktop-only nature creates massive friction. Students, beginners, and casual users give up before they start because of the installation barrier.

This project started as a GSoC 2025 proof-of-concept to show that a browser-based OpenSCAD IDE is not just possible — it can be fast, accurate, and beautiful.

### Who Is It For?
- 🎓 **Students** learning parametric 3D modeling
- 🛠️ **Makers** who want to preview SCAD files without installing OpenSCAD
- 👨‍💻 **Developers** building tools on top of OpenSCAD
- 🌍 **Anyone** who wants to design 3D models from any device

---

## 🗺️ Future Roadmap

### ✅ Phase 1 — Client Side Proof of Concept (Complete)
- Monaco editor with SCAD syntax highlighting
- Three.js renderer for all core primitives
- CSG difference/union/intersection with color preservation
- URL fetcher with auto GitHub URL conversion + CORS proxy
- localStorage persistence + auto-restore
- STL export
- Resizable panels with ResizeObserver
- Terminal with real-time logs

### 🔄 Phase 2 — Full SCAD Language Support
- `for` loops — `for (i = [0:10]) translate([i*5, 0, 0]) cube(4);`
- `module` definitions — reusable components
- `function` definitions — parametric math
- `if` / `else` conditionals
- `hull()` and `minkowski()` operations
- `echo()` → terminal output
- Better error messages with line numbers

### 🔄 Phase 3 — Backend Integration
- Node.js server running real OpenSCAD binary
- POST `/render` → returns STL with 100% SCAD accuracy
- Browser IDE stays client-side for editing
- Backend only called for final render
- Docker container for easy self-hosting

### 🔄 Phase 4 — Collaboration & Sharing
- Share models via URL (code encoded in URL hash)
- Real-time collaborative editing (WebSockets)
- Public model gallery
- Fork and remix models

### 🔄 Phase 5 — Ecosystem
- VS Code extension with live preview panel
- CLI tool for headless rendering
- npm package: `import { ParseSCAD } from 'scad-browser'`
- Mobile-responsive design

---

## 🤝 Contributing

Contributions are very welcome! Here's how to get started:

### Setup

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/Browser-OpenSCAD-IDE.git
cd Browser-OpenSCAD-IDE
npm install
npm run dev
```

### Ways to Contribute

| Area | What's Needed |
|---|---|
| 🔧 Parser | Add `for` loop, `module`, `function` support |
| 🎯 Engine | Add `hull()`, `minkowski()` operations |
| 🎨 UI/UX | Improve mobile layout |
| 📖 Docs | Add more SCAD examples |
| 🐛 Bugs | Fix issues from the Issues tab |
| ✅ Tests | Add unit tests for parser and engine |

### Contribution Flow

```bash
# Create a feature branch
git checkout -b feat/add-for-loops

# Make your changes
# Test with: npm run dev

# Commit with clear message
git commit -m "feat: add for loop support in parser"

# Push and open a Pull Request
git push origin feat/add-for-loops
```

### Good First Issues
- Add `hull()` visual fallback
- Improve error messages with line numbers
- Add more CSS color names to color parser
- Add `echo()` → terminal output support

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for full details.

Free to use, modify, and distribute. Attribution appreciated. 🙏

---

<div align="center">

**Built with ❤️ for GSoC 2026**

by [Sayantan Banerjee](https://github.com/banerjeesayantan)

<br/>

⭐ **Star this repo if you found it useful. It helps the project grow!**

<br/>

[![GitHub stars](https://img.shields.io/github/stars/banerjeesayantan/Browser-OpenSCAD-IDE?style=social)](https://github.com/banerjeesayantan/Browser-OpenSCAD-IDE)
[![GitHub forks](https://img.shields.io/github/forks/banerjeesayantan/Browser-OpenSCAD-IDE?style=social)](https://github.com/banerjeesayantan/Browser-OpenSCAD-IDE/fork)

</div>
