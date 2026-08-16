# Blocksmith Studio

A focused, Unity-style 3D editor prototype for building Minecraft-like voxel games with drag-and-drop tools and small Python scripts.

![Status](https://img.shields.io/badge/status-interactive%20prototype-d39a3f)

## What works

- Interactive Three.js voxel scene with orbit, pan, zoom, object picking, perspective and top-down cameras
- Scene hierarchy, visibility controls, object selection, duplication, deletion and transform editing
- Drag assets from the content browser into the world; double-click assets for quick placement
- Grass, dirt, stone, sand, water and bedrock blocks plus player, tree and spawn prefabs
- Python code workspace and simulated compile console
- First-person and top-down workflow controls
- Play/stop preview state and editor keyboard shortcuts
- Build window for Windows, Linux and web targets
- Real downloadable project archive containing scene JSON, Python source and a Windows PyInstaller build script
- Exported Windows project runs as an editable first-person voxel game with Ursina

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

## Creating a Windows executable

1. Click **Build** in the editor and select **Windows**.
2. Click **Build project** to download the generated ZIP.
3. Extract it on a Windows computer with Python 3.11+ installed.
4. Run `run_game.bat` to test or `build_windows.bat` to package it.
5. The standalone executable is written to `dist\StoneveilValley\StoneveilValley.exe`.

The exported runtime uses [Ursina](https://www.ursinaengine.org/) and PyInstaller. It includes WASD movement, jumping, block breaking/placement, six block slots and all placed editor blocks and tree prefabs.

## Architecture

- **React + TypeScript** — editor UI and state
- **Three.js** — real-time 3D viewport and object picking
- **JSZip** — generated game-project downloads
- **Python + Ursina** — runnable exported game runtime
- **PyInstaller** — Windows executable packaging

This repository is an ambitious editor MVP rather than a production replacement for Unity. The next production milestones would be project persistence, native desktop filesystem access, chunked voxel meshing, undo history, a real Python bridge, asset import, physics authoring and platform build workers.
