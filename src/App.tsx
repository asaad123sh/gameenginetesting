import { useCallback, useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import {
  Box, BoxSelect, Boxes, Braces, Bug, Camera, ChevronDown, ChevronRight, CircleHelp,
  Code2, Compass, Cuboid, Download, Eye, EyeOff, FileCode2, Folder, FolderOpen, Gamepad2,
  Grid3X3, Hammer, Image, Layers3, Lightbulb, Lock, Maximize2, Menu, Minus, Monitor,
  Moon, MoreHorizontal, MousePointer2, Move3D, Music2, Package, PanelBottom, Pause,
  Play, Plus, Redo2, Rotate3D, Save, Search, Settings, SlidersHorizontal, Sparkles,
  Square, Sun, TerminalSquare, TreePine, Undo2, Unlock, Upload, Volume2, X, Zap,
} from 'lucide-react'
import Viewport3D from './Viewport3D'
import { exportedPythonGame } from './exportGame'
import type { AssetItem, ObjectKind, SceneObject, Vec3 } from './types'

const initialObjects: SceneObject[] = [
  { id: 'world', name: 'Stoneveil Valley', kind: 'world', visible: true, locked: true, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
  { id: 'sun', name: 'Sun', kind: 'sun', visible: true, parent: 'world', position: [-9, 16, 9], rotation: [38, -28, 0], scale: [1, 1, 1] },
  { id: 'ground', name: 'Voxel Terrain', kind: 'ground', visible: true, locked: true, parent: 'world', position: [0, 0, 0], rotation: [0, 0, 0], scale: [24, 1, 20], material: 'Grass' },
  { id: 'oak-01', name: 'Oak Tree', kind: 'tree', visible: true, parent: 'world', position: [5, 0, -3], rotation: [0, 9, 0], scale: [1, 1, 1] },
  { id: 'oak-02', name: 'Oak Tree (2)', kind: 'tree', visible: true, parent: 'world', position: [-7, 0, -3.5], rotation: [0, -14, 0], scale: [.86, .86, .86] },
  { id: 'player', name: 'Player', kind: 'player', visible: true, parent: 'world', position: [1.5, 0, 1], rotation: [0, 35, 0], scale: [1, 1, 1] },
  { id: 'spawn', name: 'Player Spawn', kind: 'spawn', visible: true, parent: 'world', position: [1.5, .02, 1], rotation: [0, 0, 0], scale: [1, 1, 1] },
  { id: 'camera', name: 'Main Camera', kind: 'camera', visible: true, parent: 'world', position: [13, 11, 15], rotation: [-28, 40, 0], scale: [1, 1, 1] },
]

const assets: AssetItem[] = [
  { id: 'grass', name: 'Grass Block', type: 'block', color: '#718b42', accent: '#6e4e34' },
  { id: 'dirt', name: 'Dirt Block', type: 'block', color: '#78553a', accent: '#9b714b' },
  { id: 'stone', name: 'Stone Block', type: 'block', color: '#777b78', accent: '#969a95' },
  { id: 'sand', name: 'Sand Block', type: 'block', color: '#c8ab6d', accent: '#e0ca8a' },
  { id: 'water', name: 'Water Block', type: 'block', color: '#3e8597', accent: '#66afbd' },
  { id: 'bedrock', name: 'Bedrock', type: 'block', color: '#3d3f3d', accent: '#5b5c59' },
  { id: 'oak', name: 'Oak Tree', type: 'prefab', color: '#476b39', accent: '#795333', icon: 'tree' },
  { id: 'player-prefab', name: 'Player', type: 'prefab', color: '#c17a37', accent: '#30404b', icon: 'player' },
  { id: 'spawn-prefab', name: 'Spawn Point', type: 'prefab', color: '#d5a843', accent: '#715c31', icon: 'spawn' },
  { id: 'player-script', name: 'player_controller.py', type: 'script', color: '#315a4b', accent: '#e6b64f' },
  { id: 'world-script', name: 'world_rules.py', type: 'script', color: '#315a4b', accent: '#e6b64f' },
  { id: 'forest-audio', name: 'forest_ambient.ogg', type: 'audio', color: '#554566', accent: '#b493ca' },
]

const startingCode = `from blocksmith import PlayerController, key\n\nclass ValleyPlayer(PlayerController):\n    """Simple first-person movement for the player."""\n\n    walk_speed = 5.0\n    jump_height = 1.25\n    mouse_sensitivity = 0.18\n\n    def ready(self):\n        self.lock_mouse(True)\n        self.inventory.give("grass", amount=24)\n\n    def update(self, delta):\n        direction = self.input_vector("left", "right",\n                                      "forward", "back")\n        self.move(direction, speed=self.walk_speed)\n\n        if key.pressed("space") and self.is_grounded:\n            self.jump(self.jump_height)\n\n    def on_block_action(self, hit):\n        if key.mouse_left:\n            self.world.break_block(hit.position)\n        elif key.mouse_right:\n            self.world.place_block(hit.adjacent,\n                                   self.inventory.selected)\n`

const objectIcons: Record<ObjectKind, typeof Box> = {
  world: Layers3,
  sun: Sun,
  ground: Grid3X3,
  player: Gamepad2,
  tree: TreePine,
  block: Cuboid,
  spawn: Compass,
  camera: Camera,
}

function TinyLogo() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="brand-top" />
      <span className="brand-left" />
      <span className="brand-right" />
    </div>
  )
}

function IconButton({ children, active, disabled, title, onClick, className = '' }: {
  children: React.ReactNode; active?: boolean; disabled?: boolean; title: string; onClick?: () => void; className?: string
}) {
  return <button className={`icon-button ${active ? 'active' : ''} ${className}`} disabled={disabled} title={title} onClick={onClick}>{children}</button>
}

function PanelHeader({ title, icon, actions }: { title: string; icon?: React.ReactNode; actions?: React.ReactNode }) {
  return <div className="panel-header"><div className="panel-title">{icon}{title}</div><div className="panel-actions">{actions}</div></div>
}

function AssetPreview({ asset }: { asset: AssetItem }) {
  if (asset.type === 'script') return <div className="asset-file script-file"><Braces size={24} /><span>PY</span></div>
  if (asset.type === 'audio') return <div className="asset-file audio-file"><Volume2 size={27} /></div>
  if (asset.icon === 'tree') return <div className="asset-prefab tree-prefab"><i /><b /></div>
  if (asset.icon === 'player') return <div className="asset-prefab player-prefab"><i /><b /><em /></div>
  if (asset.icon === 'spawn') return <div className="asset-file spawn-file"><Compass size={30} /></div>
  return (
    <div className="block-preview" style={{ '--block-top': asset.color, '--block-side': asset.accent } as React.CSSProperties}>
      <span className="block-face-top" /><span className="block-face-left" /><span className="block-face-right" />
    </div>
  )
}

function VectorInput({ label, values, onChange, degrees = false }: { label: string; values: Vec3; onChange: (v: Vec3) => void; degrees?: boolean }) {
  const axes = ['X', 'Y', 'Z'] as const
  return (
    <div className="vector-row">
      <span className="property-label">{label}</span>
      <div className="vector-inputs">
        {values.map((value, index) => (
          <label key={axes[index]}>
            <span className={`axis axis-${axes[index].toLowerCase()}`}>{axes[index]}</span>
            <input
              aria-label={`${label} ${axes[index]}`}
              type="number"
              step={degrees ? 1 : .1}
              value={Number(value.toFixed(2))}
              onChange={(event) => {
                const next = [...values] as Vec3
                next[index] = Number(event.target.value)
                onChange(next)
              }}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function BuildModal({ onClose, objects }: { onClose: () => void; objects: SceneObject[] }) {
  const [target, setTarget] = useState('windows')
  const [status, setStatus] = useState<'idle' | 'building' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [includeDebug, setIncludeDebug] = useState(false)

  const exportProject = async () => {
    setStatus('building')
    setProgress(8)
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + Math.ceil(Math.random() * 13), 91)), 170)
    const zip = new JSZip()
    const project = {
      name: 'Stoneveil Valley',
      engine: 'Blocksmith 0.8.4',
      target,
      resolution: [1280, 720],
      scene: objects,
      debug: includeDebug,
    }
    zip.file('stoneveil_valley/project.blocksmith.json', JSON.stringify(project, null, 2))
    zip.file('stoneveil_valley/scripts/player_controller.py', startingCode)
    zip.file('stoneveil_valley/main.py', exportedPythonGame)
    zip.file('stoneveil_valley/requirements.txt', 'ursina==7.0.0\npyinstaller>=6.0\n')
    zip.file('stoneveil_valley/build_windows.bat', `@echo off\nsetlocal\ncd /d "%~dp0"\npy -m pip install -r requirements.txt\npy -m PyInstaller --noconfirm --windowed --onedir --collect-all ursina --collect-all panda3d --name StoneveilValley --add-data "project.blocksmith.json;." main.py\necho.\necho Build ready: dist\\StoneveilValley\\StoneveilValley.exe\npause\n`)
    zip.file('stoneveil_valley/run_game.bat', '@echo off\ncd /d "%~dp0"\npy -m pip install -r requirements.txt\npy main.py\n')
    zip.file('stoneveil_valley/README.txt', `STONEVEIL VALLEY — Blocksmith Project\n\nQUICK TEST\nRun run_game.bat to install the Python dependencies and play.\n\nBUILD A WINDOWS EXE\nRun build_windows.bat. The finished standalone game will be at:\ndist\\StoneveilValley\\StoneveilValley.exe\n\nPython 3.11+ is required for command-line builds. The exported game uses the open-source Ursina runtime and includes an editable voxel world, first-person movement, block breaking, and block placement.\n`)
    const blob = await zip.generateAsync({ type: 'blob' })
    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    clearInterval(timer)
    setProgress(100)
    setStatus('done')
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `StoneveilValley-${target}-project.zip`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="build-modal" role="dialog" aria-modal="true" aria-labelledby="build-title">
        <header className="modal-header">
          <div><div className="eyebrow">PROJECT EXPORT</div><h2 id="build-title">Build your game</h2><p>Package Stoneveil Valley for players.</p></div>
          <IconButton title="Close build window" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className="modal-content">
          <div className="build-targets">
            <button className={target === 'windows' ? 'selected' : ''} onClick={() => setTarget('windows')}><Monitor size={25} /><span><strong>Windows</strong><small>64-bit executable</small></span>{target === 'windows' && <i>SELECTED</i>}</button>
            <button className={target === 'web' ? 'selected' : ''} onClick={() => setTarget('web')}><Upload size={25} /><span><strong>Web</strong><small>Play in a browser</small></span>{target === 'web' && <i>SELECTED</i>}</button>
            <button className={target === 'linux' ? 'selected' : ''} onClick={() => setTarget('linux')}><TerminalSquare size={25} /><span><strong>Linux</strong><small>x86_64 package</small></span>{target === 'linux' && <i>SELECTED</i>}</button>
          </div>
          <div className="build-options">
            <div className="option-row"><div><strong>Version</strong><small>Used in the exported package</small></div><input defaultValue="0.1.0" /></div>
            <div className="option-row"><div><strong>Window size</strong><small>Initial game resolution</small></div><select defaultValue="1280"><option value="1280">1280 × 720</option><option value="1920">1920 × 1080</option><option value="0">Borderless</option></select></div>
            <label className="option-row checkbox-option"><div><strong>Include debug console</strong><small>Useful while testing Python scripts</small></div><input type="checkbox" checked={includeDebug} onChange={(e) => setIncludeDebug(e.target.checked)} /><span className="switch" /></label>
          </div>
          {status !== 'idle' && <div className={`build-progress ${status}`}><div className="progress-label"><span>{status === 'done' ? 'Build package downloaded' : 'Bundling world, scripts, and assets…'}</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div>{status === 'done' && <small>Run build_windows.bat on Windows to produce StoneveilValley.exe.</small>}</div>}
        </div>
        <footer className="modal-footer"><span><Package size={15} /> Estimated build · 42 MB</span><div><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={exportProject} disabled={status === 'building'}>{status === 'building' ? <><Hammer size={16} className="spin-slow" /> Building…</> : status === 'done' ? <><Download size={16} /> Download again</> : <><Hammer size={16} /> Build project</>}</button></div></footer>
      </section>
    </div>
  )
}

function App() {
  const [objects, setObjects] = useState<SceneObject[]>(() => {
    try {
      const savedProject = window.localStorage.getItem('blocksmith.stoneveil.scene')
      return savedProject ? JSON.parse(savedProject) as SceneObject[] : initialObjects
    } catch {
      return initialObjects
    }
  })
  const [selectedId, setSelectedId] = useState('player')
  const [transformTool, setTransformTool] = useState<'select' | 'move' | 'rotate' | 'scale'>('move')
  const [playing, setPlaying] = useState(false)
  const [cameraMode, setCameraMode] = useState<'perspective' | 'top'>('perspective')
  const [bottomTab, setBottomTab] = useState<'assets' | 'scripts' | 'console'>('assets')
  const [centerTab, setCenterTab] = useState<'scene' | 'script'>('scene')
  const [code, setCode] = useState(() => window.localStorage.getItem('blocksmith.stoneveil.playerCode') ?? startingCode)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetType, setAssetType] = useState<'all' | 'blocks' | 'prefabs' | 'scripts'>('all')
  const [buildOpen, setBuildOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [toast, setToast] = useState('')
  const [consoleLines, setConsoleLines] = useState([
    { type: 'info', text: 'Blocksmith Engine 0.8.4 · Python 3.12 runtime ready' },
    { type: 'ok', text: 'Scene “Stoneveil Valley” loaded in 482ms' },
  ])
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const selected = objects.find((object) => object.id === selectedId) ?? objects[0]
  const visibleAssets = useMemo(() => assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(assetSearch.toLowerCase())
    const matchesType = assetType === 'all' || (assetType === 'blocks' && asset.type === 'block') || (assetType === 'prefabs' && asset.type === 'prefab') || (assetType === 'scripts' && asset.type === 'script')
    return matchesSearch && matchesType
  }), [assetSearch, assetType])

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2300)
  }, [])

  const updateSelected = (patch: Partial<SceneObject>) => {
    setObjects((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item))
    setSaved(false)
  }

  const saveProject = useCallback(() => {
    window.localStorage.setItem('blocksmith.stoneveil.scene', JSON.stringify(objects))
    window.localStorage.setItem('blocksmith.stoneveil.playerCode', code)
    setSaved(true)
    notify('Project saved locally')
  }, [code, notify, objects])

  const addAsset = useCallback((assetId: string) => {
    const asset = assets.find((item) => item.id === assetId)
    if (!asset || ['script', 'audio'].includes(asset.type)) {
      if (asset?.type === 'script') setCenterTab('script')
      return
    }
    const id = `${asset.id}-${Date.now()}`
    const count = objects.filter((object) => object.name.startsWith(asset.name)).length
    let kind: ObjectKind = 'block'
    if (asset.id === 'oak') kind = 'tree'
    if (asset.id === 'player-prefab') kind = 'player'
    if (asset.id === 'spawn-prefab') kind = 'spawn'
    const next: SceneObject = {
      id,
      name: `${asset.name}${count ? ` (${count + 1})` : ''}`,
      kind,
      parent: 'world',
      visible: true,
      position: [Math.round((Math.random() * 5 - 2.5) * 2) / 2, 0, Math.round((Math.random() * 4 - 2) * 2) / 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: asset.color,
      material: asset.name.replace(' Block', ''),
    }
    setObjects((items) => [...items, next])
    setSelectedId(id)
    setSaved(false)
    notify(`${asset.name} added to the world`)
  }, [notify, objects])

  const duplicateSelected = useCallback(() => {
    if (!selected || ['world', 'sun', 'ground', 'camera'].includes(selected.kind)) return
    const id = `${selected.id}-copy-${Date.now()}`
    const copy: SceneObject = { ...selected, id, name: `${selected.name} Copy`, position: [selected.position[0] + 1, selected.position[1], selected.position[2] + 1] }
    setObjects((items) => [...items, copy])
    setSelectedId(id)
    setSaved(false)
    notify('Object duplicated')
  }, [selected, notify])

  const deleteSelected = useCallback(() => {
    if (!selected || ['world', 'sun', 'ground', 'camera', 'player'].includes(selected.kind)) {
      notify('This core object cannot be removed')
      return
    }
    setObjects((items) => items.filter((item) => item.id !== selected.id))
    setSelectedId('ground')
    setSaved(false)
  }, [selected, notify])

  const runScript = () => {
    setBottomTab('console')
    setConsoleLines((lines) => [...lines, { type: 'info', text: '> Running player_controller.py…' }, { type: 'ok', text: '✓ Script compiled successfully · 0 errors · 31ms' }])
    notify('Python script compiled successfully')
  }

  useEffect(() => {
    if (saved) return
    const autosave = window.setTimeout(() => {
      window.localStorage.setItem('blocksmith.stoneveil.scene', JSON.stringify(objects))
      window.localStorage.setItem('blocksmith.stoneveil.playerCode', code)
      setSaved(true)
    }, 3000)
    return () => window.clearTimeout(autosave)
  }, [code, objects, saved])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveProject() }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected() }
      if (!typing && event.key === 'Delete') deleteSelected()
      if (!typing && ['q', 'w', 'e', 'r'].includes(event.key.toLowerCase())) {
        const tools = { q: 'select', w: 'move', e: 'rotate', r: 'scale' } as const
        setTransformTool(tools[event.key.toLowerCase() as keyof typeof tools])
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [deleteSelected, duplicateSelected, saveProject])

  const hierarchyObjects = objects.filter((obj) => obj.id !== 'world')

  return (
    <main className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <header className="titlebar">
        <div className="brand"><TinyLogo /><div><strong>BLOCKSMITH</strong><span>STUDIO</span></div></div>
        <nav className="main-menu" aria-label="Application menu">
          {['File', 'Edit', 'Scene', 'Object', 'Tools', 'Help'].map((item) => <button key={item} onClick={() => notify(`${item} menu is ready`)}>{item}</button>)}
        </nav>
        <div className="project-title"><span className={saved ? 'saved-dot' : 'unsaved-dot'} /> Stoneveil Valley <small>{saved ? 'Saved' : 'Unsaved changes'}</small></div>
        <div className="title-actions">
          <IconButton title="Save project (Ctrl+S)" onClick={saveProject}><Save size={16} /></IconButton>
          <button className="build-button" onClick={() => setBuildOpen(true)}><Hammer size={15} /> BUILD</button>
          <IconButton title="Project settings" onClick={() => notify('Project settings')}><Settings size={17} /></IconButton>
          <div className="avatar">AS</div>
        </div>
      </header>

      <div className="main-toolbar">
        <div className="toolbar-group">
          <IconButton title="Undo (Ctrl+Z)" onClick={() => notify('Undo stack is empty')}><Undo2 size={17} /></IconButton>
          <IconButton title="Redo (Ctrl+Shift+Z)" onClick={() => notify('Redo stack is empty')}><Redo2 size={17} /></IconButton>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group transform-tools">
          <IconButton title="Select tool (Q)" active={transformTool === 'select'} onClick={() => setTransformTool('select')}><MousePointer2 size={17} /></IconButton>
          <IconButton title="Move tool (W)" active={transformTool === 'move'} onClick={() => setTransformTool('move')}><Move3D size={18} /></IconButton>
          <IconButton title="Rotate tool (E)" active={transformTool === 'rotate'} onClick={() => setTransformTool('rotate')}><Rotate3D size={18} /></IconButton>
          <IconButton title="Scale tool (R)" active={transformTool === 'scale'} onClick={() => setTransformTool('scale')}><Maximize2 size={17} /></IconButton>
        </div>
        <div className="toolbar-divider" />
        <button className="toolbar-select">GLOBAL <ChevronDown size={13} /></button>
        <button className="toolbar-select"><Grid3X3 size={14} /> 1.0 <ChevronDown size={13} /></button>
        <div className="play-controls">
          <IconButton title={playing ? 'Stop preview' : 'Play current scene'} active={playing} onClick={() => { setPlaying(!playing); setCenterTab('scene'); notify(!playing ? 'Game preview started · WASD to move' : 'Game preview stopped') }}>{playing ? <Square size={14} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</IconButton>
          <IconButton title="Pause" disabled={!playing}><Pause size={16} /></IconButton>
          <IconButton title="Debug scene" onClick={() => notify('Debug overlay enabled')}><Bug size={17} /></IconButton>
        </div>
        <div className="toolbar-spacer" />
        <span className="runtime-pill"><span /> PYTHON 3.12</span>
        <IconButton title="Command palette"><Search size={17} /></IconButton>
        <IconButton title={leftCollapsed ? 'Show hierarchy' : 'Hide hierarchy'} active={leftCollapsed} onClick={() => setLeftCollapsed(!leftCollapsed)}><Menu size={17} /></IconButton>
        <IconButton title={rightCollapsed ? 'Show inspector' : 'Hide inspector'} active={rightCollapsed} onClick={() => setRightCollapsed(!rightCollapsed)}><SlidersHorizontal size={17} /></IconButton>
      </div>

      <section className="workspace">
        {!leftCollapsed && <aside className="left-sidebar">
          <section className="panel hierarchy-panel">
            <PanelHeader title="SCENE" icon={<Layers3 size={14} />} actions={<><IconButton title="Add object" onClick={() => addAsset('grass')}><Plus size={15} /></IconButton><IconButton title="Scene options"><MoreHorizontal size={16} /></IconButton></>} />
            <div className="scene-search"><Search size={14} /><input placeholder="Filter scene…" /></div>
            <div className="hierarchy-tree">
              <button className={`hierarchy-row root ${selectedId === 'world' ? 'selected' : ''}`} onClick={() => setSelectedId('world')}>
                <ChevronDown size={13} /><Layers3 size={15} /><span>Stoneveil Valley</span><small>{objects.length - 1}</small>
              </button>
              {hierarchyObjects.map((object) => {
                const ObjIcon = objectIcons[object.kind]
                return <button className={`hierarchy-row child ${selectedId === object.id ? 'selected' : ''}`} key={object.id} onClick={() => setSelectedId(object.id)}>
                  <span className="tree-line" /><ObjIcon size={15} className={`kind-${object.kind}`} /><span>{object.name}</span>
                  {object.locked && <Lock size={11} />}
                  <span className="visibility-toggle" onClick={(event) => { event.stopPropagation(); setObjects((list) => list.map((obj) => obj.id === object.id ? { ...obj, visible: !obj.visible } : obj)) }}>{object.visible ? <Eye size={13} /> : <EyeOff size={13} />}</span>
                </button>
              })}
            </div>
            <div className="hierarchy-footer"><button onClick={() => addAsset('grass')}><Plus size={13} /> ADD OBJECT</button><span>{objects.length} OBJECTS</span></div>
          </section>
          <section className="panel quick-panel">
            <PanelHeader title="QUICK CREATE" icon={<Zap size={14} />} actions={<ChevronDown size={14} />} />
            <div className="quick-grid">
              <button onClick={() => addAsset('grass')}><Cuboid size={19} /><span>Block</span></button>
              <button onClick={() => addAsset('oak')}><TreePine size={19} /><span>Tree</span></button>
              <button onClick={() => addAsset('spawn-prefab')}><Compass size={19} /><span>Spawn</span></button>
              <button onClick={() => notify('Point light added')}><Lightbulb size={19} /><span>Light</span></button>
            </div>
          </section>
        </aside>}

        <section className="center-workspace">
          <div className="document-tabs">
            <button className={centerTab === 'scene' ? 'active' : ''} onClick={() => setCenterTab('scene')}><Box size={14} /> Stoneveil Valley <span className={!saved ? 'tab-change' : ''} /></button>
            <button className={centerTab === 'script' ? 'active' : ''} onClick={() => setCenterTab('script')}><FileCode2 size={14} /> player_controller.py <X size={12} /></button>
            <span className="tab-spacer" /><IconButton title="Open documents"><ChevronDown size={14} /></IconButton>
          </div>

          <div className="editor-stage">
            {centerTab === 'scene' ? <>
              <Viewport3D objects={objects} selectedId={selectedId} playing={playing} cameraMode={cameraMode} onSelect={setSelectedId} onDropAsset={addAsset} />
              <div className="viewport-bar">
                <button className="view-mode" onClick={() => setCameraMode(cameraMode === 'perspective' ? 'top' : 'perspective')}><BoxSelect size={14} /> {cameraMode === 'top' ? 'TOP' : 'PERSPECTIVE'} <ChevronDown size={12} /></button>
                <span className="viewport-divider" />
                <IconButton title="Shaded view" active><Sparkles size={15} /></IconButton>
                <IconButton title="Toggle grid" active><Grid3X3 size={15} /></IconButton>
                <IconButton title="Scene lighting" active><Sun size={16} /></IconButton>
                <span className="viewport-divider" />
                <button className="camera-speed">CAMERA <strong>4.0</strong></button>
              </div>
              <div className="viewport-help"><MousePointer2 size={13} /> LEFT SELECT <span>·</span> ALT + DRAG ORBIT <span>·</span> SCROLL ZOOM</div>
              <div className="axis-gizmo"><b className="axis-y">Y</b><b className="axis-z">Z</b><b className="axis-x">X</b><i /></div>
              {playing && <div className="play-overlay"><span><Play size={12} fill="currentColor" /> LIVE PREVIEW</span><small>Click viewport to capture · WASD move · Space jump · Esc release</small></div>}
            </> : <div className="code-editor">
              <div className="code-toolbar"><span><Braces size={15} /> PYTHON</span><small>player_controller.py</small><div /><button onClick={runScript}><Play size={13} fill="currentColor" /> RUN SCRIPT</button></div>
              <div className="code-breadcrumb"><span>scripts</span><ChevronRight size={12} /><span>player_controller.py</span><ChevronRight size={12} /><strong>ValleyPlayer</strong></div>
              <div className="editor-body">
                <div className="line-numbers">{code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div>
                <textarea value={code} onChange={(event) => { setCode(event.target.value); setSaved(false) }} spellCheck={false} aria-label="Python script editor" />
              </div>
              <div className="code-status"><span>Python</span><span>UTF-8</span><span>Spaces: 4</span><span className="status-ok">✓ No problems</span></div>
            </div>}
          </div>

          <section className="bottom-panel panel">
            <div className="bottom-tabs">
              <button className={bottomTab === 'assets' ? 'active' : ''} onClick={() => setBottomTab('assets')}><Package size={14} /> ASSETS</button>
              <button className={bottomTab === 'scripts' ? 'active' : ''} onClick={() => setBottomTab('scripts')}><Code2 size={14} /> SCRIPTS <span>2</span></button>
              <button className={bottomTab === 'console' ? 'active' : ''} onClick={() => setBottomTab('console')}><TerminalSquare size={14} /> CONSOLE <span>{consoleLines.length}</span></button>
              <div /><IconButton title="Collapse panel"><PanelBottom size={15} /></IconButton>
            </div>
            {bottomTab === 'assets' && <div className="asset-browser">
              <div className="folder-tree">
                <button className="active"><FolderOpen size={15} /> Assets</button>
                <button><span className="folder-line" /><Cuboid size={14} /> Blocks <small>6</small></button>
                <button><span className="folder-line" /><Boxes size={14} /> Prefabs <small>3</small></button>
                <button><span className="folder-line" /><Code2 size={14} /> Scripts <small>2</small></button>
                <button><span className="folder-line" /><Music2 size={14} /> Audio <small>1</small></button>
              </div>
              <div className="asset-content">
                <div className="asset-controls">
                  <div className="asset-filters">
                    {(['all', 'blocks', 'prefabs', 'scripts'] as const).map((type) => <button className={assetType === type ? 'active' : ''} onClick={() => setAssetType(type)} key={type}>{type.toUpperCase()}</button>)}
                  </div>
                  <div className="asset-search"><Search size={13} /><input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search assets" />{assetSearch && <X size={12} onClick={() => setAssetSearch('')} />}</div>
                  <IconButton title="Import asset" onClick={() => notify('Drop files here to import')}><Upload size={15} /></IconButton>
                </div>
                <div className="asset-grid">
                  {visibleAssets.map((asset) => <button
                    className="asset-card"
                    key={asset.id}
                    draggable
                    onDragStart={(event) => { event.dataTransfer.setData('application/blocksmith-asset', asset.id); event.dataTransfer.effectAllowed = 'copy' }}
                    onDoubleClick={() => addAsset(asset.id)}
                    onClick={() => asset.type === 'script' && setCenterTab('script')}
                    title={asset.type === 'script' ? 'Open script' : 'Drag into viewport or double-click to add'}
                  ><div className="asset-thumb"><AssetPreview asset={asset} /></div><span>{asset.name}</span><small>{asset.type}</small></button>)}
                </div>
              </div>
            </div>}
            {bottomTab === 'scripts' && <div className="scripts-list">
              <button onDoubleClick={() => setCenterTab('script')}><div><Braces size={20} /></div><span><strong>player_controller.py</strong><small>Attached to Player · 27 lines</small></span><i className="status-dot ok" /></button>
              <button><div><Braces size={20} /></div><span><strong>world_rules.py</strong><small>Attached to Stoneveil Valley · 14 lines</small></span><i className="status-dot ok" /></button>
              <button className="new-script" onClick={() => notify('New Python script created')}><Plus size={16} /> New Python script</button>
            </div>}
            {bottomTab === 'console' && <div className="console-panel">
              <div className="console-tools"><button onClick={() => setConsoleLines([])}>CLEAR</button><button><Eye size={12} /> ALL</button><span /><small><CircleHelp size={12} /> Python logs appear here</small></div>
              <div className="console-lines">{consoleLines.map((line, index) => <div className={line.type} key={index}><span>{line.type === 'ok' ? '✓' : '›'}</span><code>{line.text}</code><small>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>)}</div>
            </div>}
          </section>
        </section>

        {!rightCollapsed && <aside className="right-sidebar panel">
          <PanelHeader title="INSPECTOR" icon={<SlidersHorizontal size={14} />} actions={<><IconButton title="Lock inspector"><Unlock size={14} /></IconButton><IconButton title="Inspector options"><MoreHorizontal size={16} /></IconButton></>} />
          <div className="inspector-tabs"><button className="active">OBJECT</button><button>WORLD</button></div>
          <div className="inspector-content">
            <div className="object-heading">
              <button className="object-icon">{(() => { const ObjIcon = objectIcons[selected.kind]; return <ObjIcon size={21} /> })()}</button>
              <div><input value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} /><span>{selected.kind.toUpperCase()} <i>STATIC</i></span></div>
              <button className={`eye-heading ${selected.visible ? '' : 'off'}`} onClick={() => updateSelected({ visible: !selected.visible })}>{selected.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            </div>
            <div className="tag-row"><span className="property-label">Tag</span><select defaultValue={selected.kind === 'player' ? 'Player' : 'Untagged'}><option>Untagged</option><option>Player</option><option>Terrain</option><option>Interactive</option></select><button><Plus size={13} /></button></div>

            <section className="inspector-section open">
              <header><ChevronDown size={13} /><Move3D size={14} /><strong>TRANSFORM</strong><button onClick={() => updateSelected({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] })}>RESET</button></header>
              <div className="section-body">
                <VectorInput label="Position" values={selected.position} onChange={(position) => updateSelected({ position })} />
                <VectorInput label="Rotation" values={selected.rotation} degrees onChange={(rotation) => updateSelected({ rotation })} />
                <VectorInput label="Scale" values={selected.scale} onChange={(scale) => updateSelected({ scale })} />
              </div>
            </section>

            {selected.kind === 'player' && <>
              <section className="inspector-section open">
                <header><ChevronDown size={13} /><Gamepad2 size={14} /><strong>PLAYER CONTROLLER</strong><button><MoreHorizontal size={14} /></button></header>
                <div className="section-body property-list">
                  <label><span>Controller</span><button className="resource-field" onClick={() => setCenterTab('script')}><Braces size={13} /> player_controller.py</button></label>
                  <label><span>Walk speed</span><input type="number" defaultValue="5.0" /></label>
                  <label><span>Jump height</span><input type="number" defaultValue="1.25" /></label>
                  <label><span>Game mode</span><select defaultValue="First person"><option>First person</option><option>Top down</option><option>Creative fly</option></select></label>
                </div>
              </section>
              <section className="inspector-section open">
                <header><ChevronDown size={13} /><Box size={14} /><strong>VOXEL INTERACTION</strong><button><MoreHorizontal size={14} /></button></header>
                <div className="section-body property-list">
                  <label><span>Reach distance</span><input type="number" defaultValue="6" /></label>
                  <label><span>Can break blocks</span><input className="native-check" type="checkbox" defaultChecked /></label>
                  <label><span>Can place blocks</span><input className="native-check" type="checkbox" defaultChecked /></label>
                </div>
              </section>
            </>}

            {(selected.kind === 'block' || selected.kind === 'ground') && <section className="inspector-section open">
              <header><ChevronDown size={13} /><Cuboid size={14} /><strong>VOXEL BLOCK</strong><button><MoreHorizontal size={14} /></button></header>
              <div className="section-body property-list">
                <label><span>Material</span><select value={selected.material ?? 'Grass'} onChange={(event) => updateSelected({ material: event.target.value })}><option>Grass</option><option>Dirt</option><option>Stone</option><option>Sand</option><option>Water</option><option>Bedrock</option></select></label>
                <label><span>Breakable</span><input className="native-check" type="checkbox" defaultChecked={selected.kind !== 'ground'} /></label>
                <label><span>Hardness</span><input type="number" defaultValue={selected.material === 'Stone' ? 3 : 1} /></label>
              </div>
            </section>}

            {selected.kind === 'tree' && <section className="inspector-section open">
              <header><ChevronDown size={13} /><TreePine size={14} /><strong>TREE PREFAB</strong><button><MoreHorizontal size={14} /></button></header>
              <div className="section-body property-list"><label><span>Variant</span><select><option>Oak</option><option>Birch</option><option>Spruce</option></select></label><label><span>Drop sapling</span><input className="native-check" type="checkbox" defaultChecked /></label></div>
            </section>}

            <button className="add-component" onClick={() => notify('Component browser opened')}><Plus size={15} /> ADD COMPONENT</button>
          </div>
        </aside>}
      </section>

      <footer className="statusbar">
        <span className="engine-ready"><i /> ENGINE READY</span>
        <span><Cuboid size={11} /> {objects.length} OBJECTS</span>
        <span><Image size={11} /> 12 ASSETS</span>
        <span><Bug size={11} /> 0 ERRORS</span>
        <div />
        <span>AUTOSAVE ON</span>
        <span className="git-branch"><Code2 size={11} /> main</span>
        <span>BLOCKSMITH 0.8.4</span>
      </footer>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {buildOpen && <BuildModal onClose={() => setBuildOpen(false)} objects={objects} />}
    </main>
  )
}

export default App
