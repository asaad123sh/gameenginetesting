import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import type { SceneObject, Vec3, WorldSettings } from './types'

interface ViewportProps {
  objects: SceneObject[]
  selectedId: string
  playing: boolean
  cameraMode: 'perspective' | 'top'
  worldSettings: WorldSettings
  transformTool: 'select' | 'move' | 'rotate' | 'scale'
  transformSpace: 'world' | 'local'
  snapEnabled: boolean
  snapSize: number
  onSelect: (id: string) => void
  onDropAsset: (assetId: string) => void
  onTransform: (id: string, patch: { position: Vec3; rotation: Vec3; scale: Vec3 }) => void
  onWorldStats?: (stats: { chunks: number; blocks: number; center: string }) => void
}

const pixelTexture = (base: string, fleck: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32; canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base; ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = fleck
  ;[[2, 3, 7, 4], [17, 2, 4, 6], [25, 12, 5, 4], [8, 17, 6, 5], [21, 24, 8, 5], [1, 27, 4, 3]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h))
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

const textureFromData = (pixels?: string[]) => {
  if (!pixels?.length) return pixelTexture('#8b6b43', '#ad8b56')
  const size = Math.sqrt(pixels.length)
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const context = canvas.getContext('2d')!
  pixels.forEach((color, index) => { context.fillStyle = color; context.fillRect(index % size, Math.floor(index / size), 1, 1) })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

const makeBlockMaterials = (material = 'Grass', color?: string) => {
  const palettes: Record<string, [string, string, string, string]> = {
    Grass: ['#687f3d', '#829c4b', '#6b4b30', '#7a5939'], Dirt: ['#78543a', '#8d6746', '#78543a', '#8d6746'],
    Stone: ['#777b78', '#90938e', '#777b78', '#90938e'], Sand: ['#c3a66c', '#d2bb7d', '#b69559', '#c4a869'],
    Water: ['#3c7d8e', '#5da3b5', '#376e7f', '#488b9f'], Bedrock: ['#373936', '#4a4b48', '#373936', '#4a4b48'],
  }
  const p = palettes[material] ?? [color ?? '#9a673c', '#b37c4a', color ?? '#865733', '#9a673c']
  const side = new THREE.MeshLambertMaterial({ map: pixelTexture(p[2], p[3]) })
  const top = new THREE.MeshLambertMaterial({ map: pixelTexture(p[0], p[1]) })
  return [side, side, top, side, side, side]
}

const setRootId = (object: THREE.Object3D, id: string) => object.traverse((child) => { child.userData.rootId = id })

function buildTree(id: string) {
  const group = new THREE.Group()
  const trunkMat = new THREE.MeshLambertMaterial({ map: pixelTexture('#68472d', '#80593a') })
  const leafMat = new THREE.MeshLambertMaterial({ map: pixelTexture('#3f6736', '#547d43') })
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(.7, 2.6, .7), trunkMat); trunk.position.y = 1.3; group.add(trunk)
  ;[[0, 3, 0], [.65, 2.75, 0], [-.65, 2.75, 0], [0, 2.75, .65], [0, 2.75, -.65], [0, 3.65, 0]].forEach(([x, y, z]) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.15, 1.25), leafMat); leaf.position.set(x, y, z); group.add(leaf)
  })
  setRootId(group, id)
  return group
}

function buildPlayer(id: string) {
  const group = new THREE.Group()
  const skin = new THREE.MeshLambertMaterial({ color: '#ba8056' })
  const shirt = new THREE.MeshLambertMaterial({ color: '#c07834' })
  const pants = new THREE.MeshLambertMaterial({ color: '#34404a' })
  const head = new THREE.Mesh(new THREE.BoxGeometry(.72, .72, .72), skin); head.position.y = 2.22
  const body = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.02, .45), shirt); body.position.y = 1.34
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(.34, .9, .38), pants); leg1.position.set(-.2, .4, 0)
  const leg2 = leg1.clone(); leg2.position.x = .2
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(.26, 1, .32), skin); arm1.position.set(-.57, 1.35, 0)
  const arm2 = arm1.clone(); arm2.position.x = .57
  group.add(head, body, leg1, leg2, arm1, arm2)
  setRootId(group, id)
  return group
}

function buildCustomObject(object: SceneObject) {
  const group = new THREE.Group()
  const texture = textureFromData(object.textureData)
  const objectColor = object.color ?? '#9ba2a0'
  const material = new THREE.MeshStandardMaterial({ color: objectColor, map: texture, roughness: (object.roughness ?? 60) / 100, metalness: (object.metallic ?? (object.shape === 'sword' || object.shape === 'pickaxe' ? 45 : 0)) / 100, emissive: objectColor, emissiveIntensity: (object.emission ?? 0) / 180 })
  const wood = new THREE.MeshStandardMaterial({ color: '#67452d', roughness: .9 })
  const add = (size: [number, number, number], position: [number, number, number], mat = material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.position.set(...position); mesh.castShadow = true; group.add(mesh); return mesh
  }
  if (object.shape === 'sword') {
    add([.18, 1.45, .12], [0, 1.65, 0]); add([.9, .15, .18], [0, .9, 0]); add([.2, .75, .2], [0, .47, 0], wood); group.rotation.z = -.45
  } else if (object.shape === 'pickaxe') {
    add([.18, 1.8, .18], [0, .85, 0], wood).rotation.z = -.45; add([1.4, .23, .26], [.35, 1.5, 0]).rotation.z = .08
  } else if (object.shape === 'stairs') {
    add([1, .35, 1], [0, .18, 0]); add([1, .35, .65], [0, .53, .18]); add([1, .35, .3], [0, .88, .35])
  } else if (object.shape === 'item') add([.75, .75, .12], [0, .75, 0])
  else add([1, 1, 1], [0, .5, 0])
  setRootId(group, object.id)
  return group
}

const terrainHeight = (x: number, z: number, seed: number, biome: WorldSettings['biome']) => {
  const broad = Math.sin((x + seed * .13) * .15) * 1.2 + Math.cos((z - seed * .07) * .17) * 1.05
  const detail = Math.sin((x + z) * .42 + seed) * .38 + Math.cos((x - z) * .31) * .3
  const multiplier = biome === 'Highlands' ? 1.65 : biome === 'Desert' ? .55 : 1
  return Math.max(-1, Math.min(5, Math.floor((broad + detail) * multiplier)))
}

function populateChunks(group: THREE.Group, centerX: number, centerZ: number, settings: WorldSettings) {
  group.clear()
  const size = settings.chunkSize
  const radius = settings.infinite ? settings.renderDistance : 1
  const chunkCount = (radius * 2 + 1) ** 2
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const topColor = settings.biome === 'Desert' ? '#c2a66c' : settings.biome === 'Highlands' ? '#70805d' : '#718d48'
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', map: pixelTexture('#ffffff', settings.biome === 'Desert' ? '#ead7ad' : '#d4dfcc') })
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()
  let blocks = 0
  for (let cz = centerZ - radius; cz <= centerZ + radius; cz++) {
    for (let cx = centerX - radius; cx <= centerX + radius; cx++) {
      const mesh = new THREE.InstancedMesh(geometry, material, size * size)
      mesh.name = `Chunk ${cx},${cz}`
      mesh.userData.rootId = 'ground'
      mesh.receiveShadow = true
      let index = 0
      for (let localZ = 0; localZ < size; localZ++) {
        for (let localX = 0; localX < size; localX++) {
          const x = cx * size + localX
          const z = cz * size + localZ
          const surface = terrainHeight(x, z, settings.seed, settings.biome)
          const height = surface + 4
          matrix.compose(new THREE.Vector3(x + .5, -4 + height / 2, z + .5), new THREE.Quaternion(), new THREE.Vector3(.985, height, .985))
          mesh.setMatrixAt(index, matrix)
          const shade = ((x * 17 + z * 31 + settings.seed) % 9) / 90
          color.set(topColor).offsetHSL(0, 0, shade - .04)
          mesh.setColorAt(index, color)
          index++; blocks += height
        }
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      group.add(mesh)
    }
  }
  return { chunks: chunkCount, blocks }
}

function buildWeather(group: THREE.Group, scene: THREE.Scene, settings: WorldSettings, sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight) {
  group.clear()
  const hour = settings.timeOfDay
  const daylight = Math.max(.04, Math.sin(((hour - 6) / 12) * Math.PI))
  const nightSky = new THREE.Color('#101827')
  const daySky = new THREE.Color(settings.weather === 'Storm' ? '#59656a' : settings.weather === 'Rain' ? '#778c8d' : '#a9bea8')
  const sky = nightSky.clone().lerp(daySky, Math.min(1, daylight))
  scene.background = sky
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.copy(sky)
    scene.fog.near = settings.weather === 'Storm' ? 20 : settings.weather === 'Rain' || settings.weather === 'Snow' ? 28 : 42
    scene.fog.far = settings.weather === 'Storm' ? 58 : settings.weather === 'Rain' || settings.weather === 'Snow' ? 76 : 115
  }
  sun.intensity = (settings.weather === 'Storm' ? .7 : settings.weather === 'Rain' ? 1.35 : 3.1) * daylight
  sun.color.set(hour < 8 || hour > 18 ? '#e59a68' : '#fff4cf')
  const sunAngle = ((hour - 6) / 24) * Math.PI * 2
  sun.position.set(Math.cos(sunAngle) * 22, Math.max(2, Math.sin(sunAngle) * 26), 10)
  hemi.intensity = .35 + daylight * (settings.weather === 'Storm' ? .65 : 1.8)

  const clouds = new THREE.Group()
  clouds.name = 'CloudLayer'
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: settings.weather === 'Storm' ? '#4b5457' : '#d9dfda', transparent: true, opacity: settings.weather === 'Clear' ? .28 : .68, depthWrite: false })
  const cloudCount = settings.weather === 'Clear' ? 9 : 20
  for (let index = 0; index < cloudCount; index++) {
    const cloud = new THREE.Mesh(new THREE.BoxGeometry(5 + (index % 4) * 1.8, .45 + (index % 3) * .18, 2.3 + (index % 5) * .6), cloudMaterial)
    cloud.position.set(((index * 17) % 70) - 35, 17 + (index % 4) * 1.1, ((index * 29) % 70) - 35)
    clouds.add(cloud)
  }
  group.add(clouds)

  if (settings.weather !== 'Clear' && settings.weatherIntensity > 0) {
    const count = Math.floor(300 + settings.weatherIntensity * 12)
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count; index++) {
      positions[index * 3] = ((index * 37.7) % 50) - 25
      positions[index * 3 + 1] = ((index * 19.3) % 24) + 1
      positions[index * 3 + 2] = ((index * 53.1) % 50) - 25
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const snow = settings.weather === 'Snow'
    const material = new THREE.PointsMaterial({ color: snow ? '#edf4f4' : '#a9ced9', size: snow ? .15 : .07, transparent: true, opacity: snow ? .85 : .7, depthWrite: false })
    const precipitation = new THREE.Points(geometry, material)
    precipitation.name = snow ? 'SnowParticles' : settings.weather === 'Storm' ? 'StormParticles' : 'RainParticles'
    group.add(precipitation)
  }
}

export default function Viewport3D({ objects, selectedId, playing, cameraMode, worldSettings, transformTool, transformSpace, snapEnabled, snapSize, onSelect, onDropAsset, onTransform, onWorldStats }: ViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const dynamicRef = useRef<THREE.Group | null>(null)
  const chunksRef = useRef<THREE.Group | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const transformRef = useRef<TransformControls | null>(null)
  const selectionRef = useRef<THREE.BoxHelper | null>(null)
  const playerRef = useRef<THREE.Object3D | null>(null)
  const weatherRef = useRef<THREE.Group | null>(null)
  const sunRef = useRef<THREE.DirectionalLight | null>(null)
  const hemiRef = useRef<THREE.HemisphereLight | null>(null)
  const onSelectRef = useRef(onSelect)
  const onTransformRef = useRef(onTransform)
  const statsRef = useRef(onWorldStats)
  const playingRef = useRef(playing)
  const settingsRef = useRef(worldSettings)
  const loadedCenterRef = useRef('')
  onSelectRef.current = onSelect
  onTransformRef.current = onTransform
  statsRef.current = onWorldStats
  playingRef.current = playing
  settingsRef.current = worldSettings

  const refreshTerrain = (x: number, z: number) => {
    const group = chunksRef.current
    if (!group) return
    const settings = settingsRef.current
    const cx = Math.floor(x / settings.chunkSize)
    const cz = Math.floor(z / settings.chunkSize)
    const key = `${cx}:${cz}:${settings.seed}:${settings.chunkSize}:${settings.renderDistance}:${settings.biome}:${settings.infinite}`
    if (loadedCenterRef.current === key) return
    loadedCenterRef.current = key
    const result = populateChunks(group, cx, cz, settings)
    statsRef.current?.({ ...result, center: `${cx}, ${cz}` })
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#a9bea8')
    scene.fog = new THREE.Fog('#a9bea8', 34, 96)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, .1, 240)
    camera.position.set(13, 11, 15)
    cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = .09; controls.target.set(0, 1, 0); controls.minDistance = 5; controls.maxDistance = 75; controls.maxPolarAngle = Math.PI * .48
    controlsRef.current = controls
    const hemi = new THREE.HemisphereLight('#d9eee4', '#65523c', 2.1); hemiRef.current = hemi; scene.add(hemi)
    const sun = new THREE.DirectionalLight('#fff4cf', 3.1); sunRef.current = sun; sun.position.set(-9, 16, 9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -28; sun.shadow.camera.right = 28; sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28; scene.add(sun)

    const chunks = new THREE.Group(); chunks.name = 'infinite-chunk-stream'; chunksRef.current = chunks; scene.add(chunks)
    const dynamic = new THREE.Group(); dynamic.name = 'editor-objects'; dynamicRef.current = dynamic; scene.add(dynamic)
    const weather = new THREE.Group(); weather.name = 'weather-system'; weatherRef.current = weather; scene.add(weather); buildWeather(weather, scene, settingsRef.current, sun, hemi)

    const transformControls = new TransformControls(camera, renderer.domElement)
    transformControls.size = .85
    transformRef.current = transformControls
    scene.add(transformControls.getHelper())
    transformControls.addEventListener('dragging-changed', (event) => { controls.enabled = !Boolean(event.value) && !playingRef.current })
    transformControls.addEventListener('mouseUp', () => {
      const object = transformControls.object
      const id = object?.userData.rootId as string | undefined
      if (!object || !id) return
      const toDegrees = (value: number) => value * 180 / Math.PI
      onTransformRef.current(id, {
        position: [object.position.x, object.position.y, object.position.z],
        rotation: [toDegrees(object.rotation.x), toDegrees(object.rotation.y), toDegrees(object.rotation.z)],
        scale: [object.scale.x, object.scale.y, object.scale.z],
      })
    })
    refreshTerrain(0, 0)

    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let downX = 0; let downY = 0
    const pointerDown = (event: PointerEvent) => { downX = event.clientX; downY = event.clientY }
    const pointerUp = (event: PointerEvent) => {
      if (playingRef.current || transformRef.current?.axis || Math.hypot(event.clientX - downX, event.clientY - downY) > 4) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(scene.children, true).find((item) => item.object.userData.rootId)
      if (hit?.object.userData.rootId) onSelectRef.current(hit.object.userData.rootId)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp)
    const pressed = new Set<string>()
    const keyDown = (event: KeyboardEvent) => pressed.add(event.key.toLowerCase())
    const keyUp = (event: KeyboardEvent) => pressed.delete(event.key.toLowerCase())
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp)

    const resize = () => { if (!mount.clientWidth || !mount.clientHeight) return; camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight) }
    const observer = new ResizeObserver(resize); observer.observe(mount)
    let frame = 0; let verticalVelocity = 0; let elapsed = 0; const clock = new THREE.Clock(); const forward = new THREE.Vector3(); const right = new THREE.Vector3(); const desiredCamera = new THREE.Vector3()
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), .05); elapsed += delta
      controls.enabled = !playingRef.current && !transformRef.current?.dragging
      if (playingRef.current && playerRef.current) {
        camera.getWorldDirection(forward); forward.y = 0; forward.normalize(); right.crossVectors(forward, camera.up).normalize()
        const movement = new THREE.Vector3()
        if (pressed.has('w') || pressed.has('arrowup')) movement.add(forward)
        if (pressed.has('s') || pressed.has('arrowdown')) movement.sub(forward)
        if (pressed.has('d') || pressed.has('arrowright')) movement.add(right)
        if (pressed.has('a') || pressed.has('arrowleft')) movement.sub(right)
        if (movement.lengthSq()) {
          movement.normalize().multiplyScalar(5 * delta); playerRef.current.position.add(movement); playerRef.current.rotation.y = Math.atan2(movement.x, movement.z)
        }
        const groundLevel = terrainHeight(Math.floor(playerRef.current.position.x), Math.floor(playerRef.current.position.z), settingsRef.current.seed, settingsRef.current.biome)
        const grounded = playerRef.current.position.y <= groundLevel + .03
        if (grounded) { playerRef.current.position.y = groundLevel; verticalVelocity = pressed.has(' ') ? 6.2 : 0 }
        verticalVelocity -= 14 * delta
        playerRef.current.position.y = Math.max(groundLevel, playerRef.current.position.y + verticalVelocity * delta)
        desiredCamera.copy(playerRef.current.position).add(new THREE.Vector3(-forward.x * 6, 4.5, -forward.z * 6))
        camera.position.lerp(desiredCamera, Math.min(1, delta * 6)); camera.lookAt(playerRef.current.position.x, playerRef.current.position.y + 1.1, playerRef.current.position.z)
        refreshTerrain(playerRef.current.position.x, playerRef.current.position.z)
      } else {
        controls.update(); refreshTerrain(controls.target.x, controls.target.z)
      }
      if (weatherRef.current) {
        const focus = playingRef.current && playerRef.current ? playerRef.current.position : controls.target
        weatherRef.current.position.x = focus.x
        weatherRef.current.position.z = focus.z
        const clouds = weatherRef.current.getObjectByName('CloudLayer')
        if (clouds) clouds.position.x = ((elapsed * settingsRef.current.windSpeed * .018) % 35) - 17
        const precipitation = weatherRef.current.children.find((child) => child.name.endsWith('Particles')) as THREE.Points | undefined
        const positions = precipitation?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
        if (positions) {
          const snow = precipitation?.name === 'SnowParticles'
          for (let index = 0; index < positions.count; index++) {
            let y = positions.getY(index) - delta * (snow ? 2.2 : 15)
            let x = positions.getX(index) + delta * settingsRef.current.windSpeed * (snow ? .012 : .02)
            if (y < 0) y += 24
            if (x > 25) x -= 50
            positions.setXY(index, x, y)
          }
          positions.needsUpdate = true
        }
        if (settingsRef.current.weather === 'Storm' && sunRef.current) {
          const daylight = Math.max(.04, Math.sin(((settingsRef.current.timeOfDay - 6) / 12) * Math.PI))
          const flash = Math.sin(elapsed * .7) > .997 ? 8 : 0
          sunRef.current.intensity = .7 * daylight + flash
        }
      }
      selectionRef.current?.update()
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); transformControls.detach(); transformControls.dispose(); controls.dispose(); renderer.dispose(); mount.removeChild(renderer.domElement); scene.clear()
    }
  }, [])

  useEffect(() => {
    loadedCenterRef.current = ''
    const target = controlsRef.current?.target
    refreshTerrain(target?.x ?? 0, target?.z ?? 0)
  }, [worldSettings.biome, worldSettings.chunkSize, worldSettings.infinite, worldSettings.renderDistance, worldSettings.seed])

  useEffect(() => {
    if (weatherRef.current && sceneRef.current && sunRef.current && hemiRef.current) buildWeather(weatherRef.current, sceneRef.current, worldSettings, sunRef.current, hemiRef.current)
  }, [worldSettings.timeOfDay, worldSettings.weather, worldSettings.weatherIntensity, worldSettings.windSpeed])

  useEffect(() => {
    const dynamic = dynamicRef.current
    if (!dynamic) return
    transformRef.current?.detach()
    dynamic.clear(); selectionRef.current = null; playerRef.current = null
    objects.filter((obj) => obj.visible && !['world', 'sun', 'ground', 'camera'].includes(obj.kind)).forEach((obj) => {
      let root: THREE.Object3D
      if (obj.kind === 'tree') root = buildTree(obj.id)
      else if (obj.kind === 'player') { root = buildPlayer(obj.id); playerRef.current = root }
      else if (obj.kind === 'spawn') {
        const marker = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(.7, .035, 8, 28), new THREE.MeshBasicMaterial({ color: '#e5b44f' })); ring.rotation.x = Math.PI / 2
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 2, 6), new THREE.MeshBasicMaterial({ color: '#e5b44f', transparent: true, opacity: .65 })); beam.position.y = 1; marker.add(ring, beam); setRootId(marker, obj.id); root = marker
      } else if (['weapon', 'item', 'custom'].includes(obj.kind)) root = buildCustomObject(obj)
      else {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), makeBlockMaterials(obj.material ?? 'Grass', obj.color)); cube.castShadow = true; cube.receiveShadow = true; cube.position.y = .5; cube.userData.rootId = obj.id; root = cube
      }
      root.name = obj.name; root.position.set(...obj.position); root.rotation.set(obj.rotation[0] * Math.PI / 180, obj.rotation[1] * Math.PI / 180, obj.rotation[2] * Math.PI / 180); root.scale.set(...obj.scale); dynamic.add(root)
      if (obj.id === selectedId) {
        const helper = new THREE.BoxHelper(root, '#f2b84a'); (helper.material as THREE.LineBasicMaterial).depthTest = false; helper.renderOrder = 999; dynamic.add(helper); selectionRef.current = helper
        if (!playing && transformTool !== 'select' && transformRef.current) {
          const controls = transformRef.current
          controls.setMode(transformTool === 'move' ? 'translate' : transformTool)
          controls.setSpace(transformSpace)
          controls.setTranslationSnap(snapEnabled ? snapSize : null)
          controls.setRotationSnap(snapEnabled ? THREE.MathUtils.degToRad(15) : null)
          controls.setScaleSnap(snapEnabled ? snapSize * .25 : null)
          controls.attach(root)
        }
      }
    })
  }, [objects, playing, selectedId, snapEnabled, snapSize, transformSpace, transformTool])

  useEffect(() => {
    const camera = cameraRef.current; const controls = controlsRef.current
    if (!camera || !controls || playing) return
    if (cameraMode === 'top') { camera.position.set(0, 32, .01); controls.target.set(0, 0, 0) }
    else { camera.position.set(13, 11, 15); controls.target.set(0, 1, 0) }
    controls.update()
  }, [cameraMode, playing])

  return <div ref={mountRef} className="viewport-canvas" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDrop={(event) => { event.preventDefault(); const assetId = event.dataTransfer.getData('application/blocksmith-asset'); if (assetId) onDropAsset(assetId) }} />
}
