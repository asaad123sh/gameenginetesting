import { useMemo, useRef, useState } from 'react'
import {
  Blend, Box, Braces, Check, ChevronRight, Code2, Component, Cpu, Cuboid, Eraser, FileCode2, FlipHorizontal2, Grid2X2, Grid3X3,
  Hammer, ImagePlus, Layers3, PackagePlus, Paintbrush, PaintBucket, Pickaxe, Pipette, Plus, RotateCcw, Save,
  ShieldCheck, Sparkles, Swords, Trash2, Upload, WandSparkles, X,
} from 'lucide-react'
import ObjectPreview3D from './ObjectPreview3D'
import type { CustomAsset, CustomShape, ScriptLanguage } from './types'

const DEFAULT_TEXTURE_SIZE = 16
const defaultPython = `from blocksmith import GameObject, event

class CustomObject(GameObject):
    """Behavior attached to this object."""

    damage = 8
    cooldown = 0.35

    def ready(self):
        self.glow(enabled=False)

    @event("use")
    def on_use(self, player):
        player.play_animation("swing")
        target = self.raycast(distance=4)
        if target:
            target.damage(self.damage)
`

const defaultJava = `package game.objects;

import studio.blocksmith.api.*;

public final class CustomObject extends GameObject {
    private float damage = 8.0f;
    private float cooldown = 0.35f;

    @Override
    public void onReady() {
        setGlow(false);
    }

    @GameEvent("use")
    public void onUse(Player player) {
        player.playAnimation("swing");
        raycast(4.0f).ifPresent(target -> target.damage(damage));
    }
}
`

const shapeOptions: { id: CustomShape; name: string; detail: string; icon: typeof Box }[] = [
  { id: 'cube', name: 'Voxel block', detail: 'Full 1m cube', icon: Cuboid },
  { id: 'stairs', name: 'Voxel stairs', detail: 'Collidable steps', icon: Grid3X3 },
  { id: 'sword', name: 'Weapon', detail: 'Held melee item', icon: Swords },
  { id: 'pickaxe', name: 'Tool', detail: 'Mining tool', icon: Pickaxe },
  { id: 'item', name: 'Inventory item', detail: 'Billboard pickup', icon: PackagePlus },
]

const componentOptions = [
  { id: 'Collider', detail: 'Physical collision shape' },
  { id: 'Breakable', detail: 'Can receive mining damage' },
  { id: 'InventoryItem', detail: 'Can be picked up and stored' },
  { id: 'NetworkSync', detail: 'Replicate in multiplayer' },
  { id: 'AudioEmitter', detail: 'Positional sound support' },
  { id: 'ParticleEmitter', detail: 'Spawn visual particles' },
]

const makePixels = (base: string, size = DEFAULT_TEXTURE_SIZE) => Array.from({ length: size * size }, (_, index) => {
  if ((index * 7 + Math.floor(index / size) * 11) % 23 === 0) return '#d8b35d'
  if ((index * 3) % 19 === 0) return '#2d332f'
  return base
})

interface Props {
  initial?: CustomAsset
  onClose: () => void
  onSave: (asset: CustomAsset) => void
}

export default function ObjectStudio({ initial, onClose, onSave }: Props) {
  const [tab, setTab] = useState<'model' | 'texture' | 'code' | 'components'>('model')
  const [name, setName] = useState(initial?.name ?? 'Iron Longsword')
  const [shape, setShape] = useState<CustomShape>(initial?.shape ?? 'sword')
  const [baseColor, setBaseColor] = useState(initial?.color ?? '#8c9a9b')
  const [brush, setBrush] = useState('#d8b35d')
  const [textureSize, setTextureSize] = useState(() => Math.sqrt(initial?.textureData?.length ?? DEFAULT_TEXTURE_SIZE ** 2))
  const [pixels, setPixels] = useState<string[]>(initial?.textureData ?? makePixels('#7f8989'))
  const [paintTool, setPaintTool] = useState<'brush' | 'fill' | 'eraser' | 'picker'>('brush')
  const [mirrorPaint, setMirrorPaint] = useState(false)
  const [showPixelGrid, setShowPixelGrid] = useState(true)
  const [roughness, setRoughness] = useState(initial?.roughness ?? 72)
  const [metallic, setMetallic] = useState(initial?.metallic ?? (shape === 'sword' || shape === 'pickaxe' ? 65 : 5))
  const [emission, setEmission] = useState(initial?.emission ?? 0)
  const [language, setLanguage] = useState<ScriptLanguage>('python')
  const [pythonCode, setPythonCode] = useState(initial?.pythonCode ?? defaultPython)
  const [javaCode, setJavaCode] = useState(initial?.javaCode ?? defaultJava)
  const [components, setComponents] = useState<string[]>(initial?.components ?? ['Collider', 'InventoryItem'])
  const [wireframe, setWireframe] = useState(false)
  const [compiled, setCompiled] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const palette = useMemo(() => ['#202522', '#4c5551', '#7f8989', '#d8b35d', '#9f563f', '#527448', '#446d82', '#e7e1ca'], [])

  const setPixel = (index: number) => {
    if (paintTool === 'picker') {
      setBrush(pixels[index])
      setPaintTool('brush')
      return
    }
    setPixels((current) => {
      const next = [...current]
      const replacement = paintTool === 'eraser' ? baseColor : brush
      if (paintTool === 'fill') {
        const target = next[index]
        if (target === replacement) return next
        const queue = [index]
        const visited = new Set<number>()
        while (queue.length) {
          const point = queue.pop()!
          if (visited.has(point) || next[point] !== target) continue
          visited.add(point); next[point] = replacement
          const x = point % textureSize; const y = Math.floor(point / textureSize)
          if (x > 0) queue.push(point - 1)
          if (x < textureSize - 1) queue.push(point + 1)
          if (y > 0) queue.push(point - textureSize)
          if (y < textureSize - 1) queue.push(point + textureSize)
        }
      } else {
        next[index] = replacement
        if (mirrorPaint) {
          const x = index % textureSize; const y = Math.floor(index / textureSize)
          next[y * textureSize + (textureSize - 1 - x)] = replacement
        }
      }
      return next
    })
    setCompiled(false)
  }

  const resizeTexture = (nextSize: number) => {
    setPixels((current) => Array.from({ length: nextSize * nextSize }, (_, index) => {
      const x = index % nextSize; const y = Math.floor(index / nextSize)
      const sourceX = Math.min(textureSize - 1, Math.floor(x * textureSize / nextSize))
      const sourceY = Math.min(textureSize - 1, Math.floor(y * textureSize / nextSize))
      return current[sourceY * textureSize + sourceX]
    }))
    setTextureSize(nextSize)
  }

  const noiseTexture = () => {
    const colors = [baseColor, brush, '#303632', '#c6a657']
    setPixels(Array.from({ length: textureSize * textureSize }, (_, index) => colors[(index * 17 + Math.floor(index / textureSize) * 7) % colors.length]))
  }

  const importTexture = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = textureSize; canvas.height = textureSize
        const context = canvas.getContext('2d')!
        context.imageSmoothingEnabled = false
        context.drawImage(image, 0, 0, textureSize, textureSize)
        const data = context.getImageData(0, 0, textureSize, textureSize).data
        setPixels(Array.from({ length: textureSize * textureSize }, (_, index) => `#${[data[index * 4], data[index * 4 + 1], data[index * 4 + 2]].map((value) => value.toString(16).padStart(2, '0')).join('')}`))
        setTab('texture')
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const save = () => {
    const asset: CustomAsset = {
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim() || 'Untitled Object',
      type: 'custom',
      color: baseColor,
      accent: brush,
      shape,
      textureData: pixels,
      pythonCode,
      javaCode,
      components,
      roughness,
      metallic,
      emission,
      icon: shape,
    }
    onSave(asset)
    onClose()
  }

  return (
    <div className="studio-backdrop">
      <section className="object-studio" role="dialog" aria-modal="true" aria-label="Object Studio">
        <header className="studio-titlebar">
          <div className="studio-brand"><div className="studio-logo"><WandSparkles size={18} /></div><div><span>BLOCKSMITH</span><strong>OBJECT STUDIO</strong></div></div>
          <div className="studio-path"><span>Assets</span><ChevronRight size={12} /><span>Custom</span><ChevronRight size={12} /><strong>{name || 'Untitled Object'}</strong></div>
          <div className="studio-actions"><span className="draft-state"><i /> LIVE DRAFT</span><button onClick={onClose}>CANCEL</button><button className="save-object" onClick={save}><Save size={14} /> SAVE OBJECT</button><button className="studio-close" onClick={onClose}><X size={17} /></button></div>
        </header>

        <div className="studio-workspace">
          <aside className="studio-nav">
            <div className="workflow-label">OBJECT WORKFLOW</div>
            <button className={tab === 'model' ? 'active' : ''} onClick={() => setTab('model')}><span><Box size={17} /></span><div><strong>01 · MODEL</strong><small>Shape & geometry</small></div><Check size={13} /></button>
            <button className={tab === 'texture' ? 'active' : ''} onClick={() => setTab('texture')}><span><Paintbrush size={17} /></span><div><strong>02 · TEXTURE</strong><small>Pixel paint & color</small></div><Check size={13} /></button>
            <button className={tab === 'components' ? 'active' : ''} onClick={() => setTab('components')}><span><Component size={17} /></span><div><strong>03 · COMPONENTS</strong><small>Physics & gameplay</small></div><Check size={13} /></button>
            <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}><span><Braces size={17} /></span><div><strong>04 · BEHAVIOR</strong><small>Python or Java</small></div>{compiled ? <Check size={13} /> : <i />}</button>
            <div className="studio-nav-spacer" />
            <div className="asset-summary"><Layers3 size={14} /><span><strong>CUSTOM ASSET</strong><small>Stored in Assets/Custom</small></span></div>
          </aside>

          <main className="studio-main">
            {tab === 'model' && <div className="model-workspace">
              <div className="studio-section-heading"><div><span>STEP 01</span><h2>Choose a base shape</h2><p>Start from a game-ready primitive. You can texture and script it next.</p></div><div className="poly-stat"><Cpu size={14} /><span><strong>{shape === 'cube' ? '12' : shape === 'sword' ? '60' : '48'} TRIANGLES</strong><small>LOW POLY · OPTIMIZED</small></span></div></div>
              <div className="shape-and-preview">
                <div className="shape-library">
                  <div className="subheading">BASE GEOMETRY</div>
                  {shapeOptions.map((option) => { const Icon = option.icon; return <button key={option.id} className={shape === option.id ? 'selected' : ''} onClick={() => { setShape(option.id); setCompiled(false) }}><span><Icon size={20} /></span><div><strong>{option.name}</strong><small>{option.detail}</small></div>{shape === option.id && <Check size={13} />}</button> })}
                </div>
                <div className="large-object-preview"><ObjectPreview3D shape={shape} color={baseColor} textureData={pixels} wireframe={wireframe} roughness={roughness} metallic={metallic} emission={emission} /><div className="preview-label"><span><Sparkles size={12} /> REAL-TIME PREVIEW</span><small>DRAG TO ORBIT · SCROLL TO ZOOM</small></div><div className="preview-tools"><button className={!wireframe ? 'active' : ''} onClick={() => setWireframe(false)}>SOLID</button><button className={wireframe ? 'active' : ''} onClick={() => setWireframe(true)}>WIREFRAME</button></div></div>
              </div>
            </div>}

            {tab === 'texture' && <div className="texture-workspace">
              <div className="studio-section-heading texture-heading"><div><span>STEP 02</span><h2>Advanced texture authoring</h2><p>Paint, fill, mirror, import, and preview game-ready PBR pixel materials.</p></div><label className="resolution-select"><span>RESOLUTION</span><select value={textureSize} onChange={(event) => resizeTexture(Number(event.target.value))}><option value="16">16 × 16</option><option value="32">32 × 32</option><option value="64">64 × 64</option></select></label><button className="tool-button" onClick={() => uploadRef.current?.click()}><Upload size={14} /> IMPORT TEXTURE</button><input hidden ref={uploadRef} type="file" accept="image/png,image/jpeg" onChange={(event) => importTexture(event.target.files?.[0])} /></div>
              <div className="texture-editor-layout">
                <div className="paint-tools">
                  <div className="subheading">PAINT TOOLS</div>
                  <div className="paint-tool-grid"><button className={paintTool === 'brush' ? 'active' : ''} onClick={() => setPaintTool('brush')} title="Pixel brush"><Paintbrush size={14} /></button><button className={paintTool === 'fill' ? 'active' : ''} onClick={() => setPaintTool('fill')} title="Flood fill"><PaintBucket size={14} /></button><button className={paintTool === 'eraser' ? 'active' : ''} onClick={() => setPaintTool('eraser')} title="Erase to base tint"><Eraser size={14} /></button><button className={paintTool === 'picker' ? 'active' : ''} onClick={() => setPaintTool('picker')} title="Pick color"><Pipette size={14} /></button></div>
                  <div className="paint-toggles"><button className={mirrorPaint ? 'active' : ''} onClick={() => setMirrorPaint(!mirrorPaint)}><FlipHorizontal2 size={12} /> MIRROR X</button><button className={showPixelGrid ? 'active' : ''} onClick={() => setShowPixelGrid(!showPixelGrid)}><Grid2X2 size={12} /> GRID</button></div>
                  <div className="subheading palette-title">PALETTE</div>
                  <div className="palette-grid">{palette.map((color) => <button key={color} className={brush === color ? 'active' : ''} style={{ backgroundColor: color }} onClick={() => setBrush(color)} title={color} />)}<label className="custom-color"><Plus size={13} /><input type="color" value={brush} onChange={(e) => setBrush(e.target.value)} /></label></div>
                  <label className="hex-field"><span>HEX</span><input value={brush.toUpperCase()} onChange={(event) => setBrush(event.target.value)} /></label>
                  <div className="texture-layers"><div className="subheading">MATERIAL LAYERS</div><button className="active"><span className="layer-thumb" style={{ background: baseColor }} /><div><strong>ALBEDO</strong><small>Base color</small></div><Check size={10} /></button><button><span className="layer-thumb normal" /><div><strong>NORMAL</strong><small>Auto generated</small></div><Sparkles size={10} /></button><button><span className="layer-thumb emissive" /><div><strong>EMISSIVE</strong><small>{emission}% strength</small></div><Blend size={10} /></button></div>
                  <div className="paint-actions"><button onClick={noiseTexture}><Sparkles size={14} /> GENERATE PATTERN</button><button onClick={() => setPixels(Array(textureSize * textureSize).fill(baseColor))}><Trash2 size={14} /> CLEAR CANVAS</button></div>
                </div>
                <div className="pixel-editor-shell"><div className="pixel-ruler top" style={{ gridTemplateColumns: `repeat(${textureSize},1fr)` }}>{Array.from({ length: textureSize }, (_, i) => <span key={i}>{i % Math.max(4, textureSize / 4) === 0 ? i : ''}</span>)}</div><div className="pixel-ruler left" style={{ gridTemplateRows: `repeat(${textureSize},1fr)` }}>{Array.from({ length: textureSize }, (_, i) => <span key={i}>{i % Math.max(4, textureSize / 4) === 0 ? i : ''}</span>)}</div><div className={`pixel-canvas ${showPixelGrid ? '' : 'hide-grid'}`} style={{ gridTemplateColumns: `repeat(${textureSize},1fr)` }} onContextMenu={(event) => event.preventDefault()}>{pixels.map((pixel, index) => <button key={index} style={{ background: pixel }} onPointerDown={() => setPixel(index)} onPointerEnter={(event) => event.buttons === 1 && paintTool !== 'fill' && paintTool !== 'picker' && setPixel(index)} title={`${index % textureSize}, ${Math.floor(index / textureSize)}`} />)}</div><div className="pixel-info">{textureSize} × {textureSize} PX <span>·</span> {paintTool.toUpperCase()} <span>·</span> NEAREST</div></div>
                <div className="texture-preview-panel"><div className="subheading">PBR MATERIAL PREVIEW</div><div className="texture-small-preview"><ObjectPreview3D shape={shape} color={baseColor} textureData={pixels} roughness={roughness} metallic={metallic} emission={emission} /></div><div className="texture-properties"><label><span>Base tint</span><div><input type="color" value={baseColor} onChange={(event) => setBaseColor(event.target.value)} /><code>{baseColor.toUpperCase()}</code></div></label><label><span>Filtering</span><select><option>Nearest · Pixel art</option><option>Linear · Smooth</option><option>Anisotropic ×16</option></select></label><label><span>Roughness <b>{roughness}%</b></span><input type="range" value={roughness} onChange={(event) => setRoughness(Number(event.target.value))} /></label><label><span>Metallic <b>{metallic}%</b></span><input type="range" value={metallic} onChange={(event) => setMetallic(Number(event.target.value))} /></label><label><span>Emission <b>{emission}%</b></span><input type="range" value={emission} onChange={(event) => setEmission(Number(event.target.value))} /></label><div className="material-budget"><Cpu size={12} /><span><strong>GPU READY</strong><small>{pixels.length.toLocaleString()} texels · 3 channels</small></span></div></div></div>
              </div>
            </div>}

            {tab === 'components' && <div className="components-workspace">
              <div className="studio-section-heading"><div><span>STEP 03</span><h2>Add game components</h2><p>Combine reusable systems without writing code.</p></div><span className="selected-count">{components.length} ENABLED</span></div>
              <div className="component-grid">{componentOptions.map((component) => { const active = components.includes(component.id); return <button key={component.id} className={active ? 'active' : ''} onClick={() => setComponents((items) => active ? items.filter((item) => item !== component.id) : [...items, component.id])}><span>{component.id === 'Collider' ? <Box size={20} /> : component.id === 'NetworkSync' ? <Cpu size={20} /> : component.id === 'Breakable' ? <Hammer size={20} /> : <Component size={20} />}</span><div><strong>{component.id}</strong><small>{component.detail}</small></div><i>{active ? <Check size={12} /> : <Plus size={12} />}</i></button> })}</div>
              <div className="component-note"><ShieldCheck size={18} /><div><strong>Game-ready composition</strong><span>Components are included in exports and available from both Python and Java scripts.</span></div></div>
            </div>}

            {tab === 'code' && <div className="behavior-workspace">
              <div className="studio-section-heading code-heading"><div><span>STEP 04</span><h2>Program object behavior</h2><p>Use Python for fast iteration or Java for larger game systems.</p></div><div className="language-switch"><button className={language === 'python' ? 'active' : ''} onClick={() => setLanguage('python')}><Braces size={14} /> PYTHON</button><button className={language === 'java' ? 'active' : ''} onClick={() => setLanguage('java')}><FileCode2 size={14} /> JAVA</button></div><button className="compile-button" onClick={() => setCompiled(true)}><RotateCcw size={14} /> COMPILE & CHECK</button></div>
              <div className="studio-code-shell"><div className="studio-code-toolbar"><span><i className={language} />{language === 'python' ? 'custom_object.py' : 'CustomObject.java'}</span><div /><small>AUTOCOMPLETE</small><small>UTF-8</small></div><div className="studio-code-editor"><div className="studio-lines">{(language === 'python' ? pythonCode : javaCode).split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea spellCheck={false} value={language === 'python' ? pythonCode : javaCode} onChange={(event) => { language === 'python' ? setPythonCode(event.target.value) : setJavaCode(event.target.value); setCompiled(false) }} /></div><div className={`compile-status ${compiled ? 'success' : ''}`}>{compiled ? <><Check size={13} /> Build check passed · 0 errors · Both language bindings ready</> : <><Code2 size={13} /> Edit the script, then run Compile & Check</>}</div></div>
            </div>}
          </main>

          <aside className="studio-inspector">
            <div className="studio-inspector-title"><span>OBJECT PROPERTIES</span><button><X size={13} /></button></div>
            <div className="studio-inspector-body">
              <label className="studio-field"><span>Display name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="studio-field"><span>Asset ID</span><input value={name.toLowerCase().replace(/[^a-z0-9]+/g, '_')} readOnly /><small>Generated automatically</small></label>
              <label className="studio-field"><span>Category</span><select value={shape} onChange={(event) => setShape(event.target.value as CustomShape)}><option value="cube">Block</option><option value="stairs">Building</option><option value="sword">Weapon</option><option value="pickaxe">Tool</option><option value="item">Item</option></select></label>
              <div className="studio-divider" />
              <div className="studio-property-title">GAMEPLAY DEFAULTS</div>
              <label className="studio-field inline"><span>Stack size</span><input type="number" defaultValue={shape === 'cube' ? 64 : 1} /></label>
              <label className="studio-field inline"><span>Durability</span><input type="number" defaultValue={shape === 'sword' || shape === 'pickaxe' ? 250 : 0} /></label>
              <label className="studio-field inline"><span>Mass</span><input type="number" defaultValue="1.0" step="0.1" /></label>
              <div className="studio-divider" />
              <div className="studio-property-title">EXPORT SUMMARY</div>
              <div className="export-check"><Check size={12} /><span>Mesh optimized</span></div><div className="export-check"><Check size={12} /><span>Texture embedded</span></div><div className="export-check"><Check size={12} /><span>Python binding</span></div><div className="export-check"><Check size={12} /><span>Java binding</span></div>
            </div>
          </aside>
        </div>
        <footer className="studio-status"><span><i /> OBJECT STUDIO READY</span><span>{textureSize} × {textureSize} PBR TEXTURE</span><span>{components.length} COMPONENTS</span><div /><span>OBJECT API 2.4</span><span>BLOCKSMITH 0.9.0</span></footer>
      </section>
    </div>
  )
}
