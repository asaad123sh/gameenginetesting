import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneObject } from './types'

interface ViewportProps {
  objects: SceneObject[]
  selectedId: string
  playing: boolean
  cameraMode: 'perspective' | 'top'
  onSelect: (id: string) => void
  onDropAsset: (assetId: string) => void
}

const pixelTexture = (base: string, fleck: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = fleck
  const marks = [[2, 3, 7, 4], [17, 2, 4, 6], [25, 12, 5, 4], [8, 17, 6, 5], [21, 24, 8, 5], [1, 27, 4, 3]]
  marks.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h))
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

const makeBlockMaterials = (material = 'Grass', color?: string) => {
  const palettes: Record<string, [string, string, string, string]> = {
    Grass: ['#687f3d', '#829c4b', '#6b4b30', '#7a5939'],
    Dirt: ['#78543a', '#8d6746', '#78543a', '#8d6746'],
    Stone: ['#777b78', '#90938e', '#777b78', '#90938e'],
    Sand: ['#c3a66c', '#d2bb7d', '#b69559', '#c4a869'],
    Water: ['#3c7d8e', '#5da3b5', '#376e7f', '#488b9f'],
    Bedrock: ['#373936', '#4a4b48', '#373936', '#4a4b48'],
  }
  const p = palettes[material] ?? [color ?? '#9a673c', '#b37c4a', color ?? '#865733', '#9a673c']
  const side = new THREE.MeshLambertMaterial({ map: pixelTexture(p[2], p[3]) })
  const top = new THREE.MeshLambertMaterial({ map: pixelTexture(p[0], p[1]) })
  return [side, side, top, side, side, side]
}

const setRootId = (object: THREE.Object3D, id: string) => {
  object.traverse((child) => { child.userData.rootId = id })
}

function buildTree(id: string) {
  const group = new THREE.Group()
  const trunkMat = new THREE.MeshLambertMaterial({ map: pixelTexture('#68472d', '#80593a') })
  const leafMat = new THREE.MeshLambertMaterial({ map: pixelTexture('#3f6736', '#547d43') })
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(.7, 2.6, .7), trunkMat)
  trunk.position.y = 1.3
  group.add(trunk)
  ;[[0, 3, 0], [.65, 2.75, 0], [-.65, 2.75, 0], [0, 2.75, .65], [0, 2.75, -.65], [0, 3.65, 0]].forEach(([x, y, z]) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.15, 1.25), leafMat)
    leaf.position.set(x, y, z)
    group.add(leaf)
  })
  setRootId(group, id)
  return group
}

function buildPlayer(id: string) {
  const group = new THREE.Group()
  const skin = new THREE.MeshLambertMaterial({ color: '#ba8056' })
  const shirt = new THREE.MeshLambertMaterial({ color: '#c07834' })
  const pants = new THREE.MeshLambertMaterial({ color: '#34404a' })
  const head = new THREE.Mesh(new THREE.BoxGeometry(.72, .72, .72), skin)
  head.position.y = 2.22
  const body = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.02, .45), shirt)
  body.position.y = 1.34
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(.34, .9, .38), pants)
  leg1.position.set(-.2, .4, 0)
  const leg2 = leg1.clone(); leg2.position.x = .2
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(.26, 1, .32), skin)
  arm1.position.set(-.57, 1.35, 0)
  const arm2 = arm1.clone(); arm2.position.x = .57
  group.add(head, body, leg1, leg2, arm1, arm2)
  setRootId(group, id)
  return group
}

export default function Viewport3D({ objects, selectedId, playing, cameraMode, onSelect, onDropAsset }: ViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const dynamicRef = useRef<THREE.Group | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const selectionRef = useRef<THREE.BoxHelper | null>(null)
  const playerRef = useRef<THREE.Object3D | null>(null)
  const onSelectRef = useRef(onSelect)
  const playingRef = useRef(playing)
  onSelectRef.current = onSelect
  playingRef.current = playing

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#a9bea8')
    scene.fog = new THREE.Fog('#a9bea8', 23, 48)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, .1, 100)
    camera.position.set(13, 11, 15)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = .09
    controls.target.set(0, 1, 0)
    controls.minDistance = 5
    controls.maxDistance = 38
    controls.maxPolarAngle = Math.PI * .48
    controlsRef.current = controls

    const hemi = new THREE.HemisphereLight('#d9eee4', '#65523c', 2.1)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight('#fff4cf', 3.1)
    sun.position.set(-9, 16, 9)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -18; sun.shadow.camera.right = 18
    sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18
    scene.add(sun)

    const groundMat = makeBlockMaterials('Grass')
    const ground = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 20), groundMat)
    ground.position.set(0, -.5, 0)
    ground.receiveShadow = true
    ground.userData.rootId = 'ground'
    scene.add(ground)

    const stoneMats = makeBlockMaterials('Stone')
    const grassMats = makeBlockMaterials('Grass')
    const terrain = new THREE.Group()
    const ridge: [number, number, number, number][] = [
      [-9, 0, -7, 2], [-8, 0, -7, 2], [-7, 0, -7, 1], [-9, 0, -6, 2], [-8, 0, -6, 1],
      [8, 0, -7, 2], [9, 0, -7, 3], [8, 0, -6, 1], [9, 0, -6, 2], [10, 0, -6, 1],
      [-10, 0, 5, 1], [-9, 0, 6, 2], [-8, 0, 7, 1], [9, 0, 7, 1], [10, 0, 6, 2],
      [5, 0, 7, 1], [6, 0, 7, 1], [-4, 0, -8, 1], [-3, 0, -8, 1],
    ]
    ridge.forEach(([x, , z, h], i) => {
      for (let y = 0; y < h; y++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), y === h - 1 ? grassMats : stoneMats)
        b.position.set(x, y + .5, z)
        b.receiveShadow = true; b.castShadow = true
        b.userData.rootId = 'ground'
        terrain.add(b)
      }
    })
    scene.add(terrain)

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(5.7, 3.2),
      new THREE.MeshLambertMaterial({ color: '#4d91a1', transparent: true, opacity: .78 }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.set(-4.2, .035, 3.4)
    water.userData.rootId = 'ground'
    scene.add(water)

    const grid = new THREE.GridHelper(24, 24, '#3d4d38', '#718067')
    grid.position.y = .012
    ;(grid.material as THREE.Material).opacity = .28
    ;(grid.material as THREE.Material).transparent = true
    scene.add(grid)

    const dynamic = new THREE.Group()
    dynamic.name = 'editor-objects'
    dynamicRef.current = dynamic
    scene.add(dynamic)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downX = 0; let downY = 0
    const pointerDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY }
    const pointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const hit = hits.find((item) => item.object.userData.rootId)
      if (hit?.object.userData.rootId) onSelectRef.current(hit.object.userData.rootId)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerup', pointerUp)

    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    let frame = 0
    const clock = new THREE.Clock()
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const time = clock.getElapsedTime()
      controls.update()
      if (playingRef.current && playerRef.current) {
        playerRef.current.rotation.y += .004
        playerRef.current.position.y += Math.sin(time * 3) * .0007
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      scene.clear()
    }
  }, [])

  useEffect(() => {
    const dynamic = dynamicRef.current
    const scene = sceneRef.current
    if (!dynamic || !scene) return
    dynamic.clear()
    selectionRef.current = null
    playerRef.current = null

    objects.filter((obj) => obj.visible && !['world', 'sun', 'ground', 'camera'].includes(obj.kind)).forEach((obj) => {
      let root: THREE.Object3D
      if (obj.kind === 'tree') root = buildTree(obj.id)
      else if (obj.kind === 'player') {
        root = buildPlayer(obj.id)
        playerRef.current = root
      } else if (obj.kind === 'spawn') {
        const marker = new THREE.Group()
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.7, .035, 8, 28), new THREE.MeshBasicMaterial({ color: '#e5b44f' }))
        ring.rotation.x = Math.PI / 2
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 2, 6), new THREE.MeshBasicMaterial({ color: '#e5b44f', transparent: true, opacity: .65 }))
        beam.position.y = 1
        marker.add(ring, beam)
        setRootId(marker, obj.id)
        root = marker
      } else {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), makeBlockMaterials(obj.material ?? 'Grass', obj.color))
        cube.castShadow = true; cube.receiveShadow = true
        cube.position.y = .5
        cube.userData.rootId = obj.id
        root = cube
      }
      root.name = obj.name
      root.position.set(...obj.position)
      root.rotation.set(obj.rotation[0] * Math.PI / 180, obj.rotation[1] * Math.PI / 180, obj.rotation[2] * Math.PI / 180)
      root.scale.set(...obj.scale)
      dynamic.add(root)
      if (obj.id === selectedId) {
        const helper = new THREE.BoxHelper(root, '#f2b84a')
        ;(helper.material as THREE.LineBasicMaterial).depthTest = false
        helper.renderOrder = 999
        dynamic.add(helper)
        selectionRef.current = helper
      }
    })
  }, [objects, selectedId])

  useEffect(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    if (cameraMode === 'top') {
      camera.position.set(0, 24, .01)
      controls.target.set(0, 0, 0)
    } else {
      camera.position.set(13, 11, 15)
      controls.target.set(0, 1, 0)
    }
    controls.update()
  }, [cameraMode])

  return (
    <div
      ref={mountRef}
      className="viewport-canvas"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      onDrop={(e) => {
        e.preventDefault()
        const assetId = e.dataTransfer.getData('application/blocksmith-asset')
        if (assetId) onDropAsset(assetId)
      }}
    />
  )
}
