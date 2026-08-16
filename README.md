# Blocksmith Studio

A professional Unity-style 3D editor prototype focused on Minecraft-like voxel games, infinite procedural worlds, drag-and-drop creation, and lightweight Python or Java behaviors.

![Status](https://img.shields.io/badge/status-advanced%20interactive%20prototype-d39a3f)

## Advanced editor features

### Infinite voxel worlds

- Deterministic chunk generation from a configurable world seed
- Live chunk streaming as the editor camera or player moves
- Automatic unloading and regeneration of distant chunks
- Adjustable chunk size and render distance
- Meadow, Highlands and Desert terrain profiles
- Instanced Three.js terrain rendering for thousands of visible voxel columns
- Matching infinite chunk manager in the exported Python game runtime

### Object Studio

The built-in **Object Studio** creates complete game assets without leaving the editor:

- Voxel blocks, stairs, swords, pickaxes, tools and inventory items
- Real-time rotatable 3D material preview
- 16×16 pixel texture painter with palettes and pattern generation
- PNG/JPEG texture importing and nearest-neighbor conversion
- Custom tint, roughness and filtering controls
- Drag-and-drop component composition
- Collider, breakable, inventory, multiplayer sync, audio and particle components
- Python and Java behavior editors for every custom object
- Persistent custom asset library
- Live editing of every placed instance from the Inspector

### Core game-editor workflow

- Real-time Three.js scene viewport with orbit, pan, zoom and picking
- Scene hierarchy, visibility controls and object inspector
- Real 50-step undo/redo history with keyboard shortcuts
- Position, rotation and scale authoring
- Perspective and top-down camera modes
- Drag assets into the streamed world
- Player, trees, spawn points and six built-in block materials
- Python workspace, compile console, project browser and script attachments
- Play mode with WASD movement, jumping, third-person camera, HUD and hotbar
- Local project saving and autosave
- Windows, Linux and web build-target interface

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For a production bundle:

```bash
npm run build
npm run preview
```

## Editor shortcuts

| Shortcut | Action |
| --- | --- |
| `Q` | Select tool |
| `W` | Move tool |
| `E` | Rotate tool |
| `R` | Scale tool |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + D` | Duplicate selected object |
| `Delete` | Delete selected object |

## Native single-file Windows builds

1. Click **Build** and select **Windows — Single portable .exe**.
2. Click **Build release** to download the generated native-build kit.
3. Extract it on Windows with Python 3.11+ and a supported C compiler.
4. Run `compile_single_exe.bat`.
5. The Nuitka native backend produces one `StoneveilValley.exe`, rather than a PyInstaller directory bundle.

The browser edition cannot execute a Windows compiler inside the browser sandbox, so it prepares the complete deterministic build kit. A native Blocksmith desktop host can run the same command directly and return the `.exe` from the Build window.

The archive contains:

- Infinite-world project settings and scene JSON
- Self-contained Ursina game source with chunk streaming
- Custom object definitions and embedded pixel texture data
- Separate Python and Java source for every custom object
- A Nuitka one-file native compilation recipe

## Architecture

- **React + TypeScript** — editor shell, inspector, project state and Object Studio
- **Three.js** — scene viewport, instanced chunk terrain and real-time object previews
- **JSZip** — generated build-kit downloads
- **Python + Ursina** — runnable exported voxel game runtime
- **Java 21 bindings** — per-object gameplay source authoring
- **Nuitka** — native single-file Windows compilation backend

This remains an advanced editor MVP rather than a production replacement for Unity. Production milestones include a desktop filesystem host, background chunk workers, greedy voxel meshing, real physics authoring, compiled Java runtime integration, multiplayer servers, undo history, binary asset databases and managed cloud build workers.
