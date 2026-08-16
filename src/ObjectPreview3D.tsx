import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CustomShape } from './types'

interface Props {
  shape: CustomShape
  color: string
  textureData: string[]
  wireframe?: boolean
  roughness?: number
  metallic?: number
  emission?: number
}

function textureFromPixels(pixels: string[]) {
  const size = Math.sqrt(pixels.length) || 16
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  pixels.forEach((pixel, index) => {
    context.fillStyle = pixel
    context.fillRect(index % size, Math.floor(index / size), 1, 1)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

function buildModel(shape: CustomShape, material: THREE.MeshStandardMaterial) {
  const group = new THREE.Group()
  const add = (geometry: THREE.BufferGeometry, position: [number, number, number], scale: [number, number, number], mat = material) => {
    const mesh = new THREE.Mesh(geometry, mat)
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  if (shape === 'cube') add(new THREE.BoxGeometry(), [0, 0, 0], [1.5, 1.5, 1.5])
  if (shape === 'stairs') {
    add(new THREE.BoxGeometry(), [0, -.5, 0], [1.8, .6, 1.5])
    add(new THREE.BoxGeometry(), [0, .05, .32], [1.8, .5, .85])
    add(new THREE.BoxGeometry(), [0, .55, .62], [1.8, .5, .3])
  }
  if (shape === 'sword') {
    const metal = material.clone(); metal.metalness = .7; metal.roughness = .25
    add(new THREE.BoxGeometry(), [0, .62, 0], [.25, 1.75, .13], metal).rotation.z = -.04
    add(new THREE.BoxGeometry(), [0, -.28, 0], [1.05, .18, .2])
    const handle = new THREE.MeshStandardMaterial({ color: '#5b3a25', roughness: .8 })
    add(new THREE.BoxGeometry(), [0, -.83, 0], [.26, .92, .24], handle)
    add(new THREE.BoxGeometry(), [0, -1.3, 0], [.46, .25, .35], material)
    group.rotation.z = -.58
  }
  if (shape === 'pickaxe') {
    const wood = new THREE.MeshStandardMaterial({ color: '#795034', roughness: .9 })
    add(new THREE.BoxGeometry(), [0, -.15, 0], [.23, 2.2, .22], wood).rotation.z = -.55
    const head = add(new THREE.BoxGeometry(), [.48, .65, 0], [1.7, .28, .3])
    head.rotation.z = .08
    const left = add(new THREE.ConeGeometry(.26, .8, 4), [-.42, .58, 0], [1, 1, 1]); left.rotation.z = Math.PI / 2
    const right = add(new THREE.ConeGeometry(.26, .8, 4), [1.35, .78, 0], [1, 1, 1]); right.rotation.z = -Math.PI / 2
  }
  if (shape === 'item') {
    add(new THREE.BoxGeometry(), [0, 0, 0], [1.15, 1.15, .22])
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.18, 1.18, .25)), new THREE.LineBasicMaterial({ color: '#e1bd66' }))
    group.add(border)
  }
  return group
}

export default function ObjectPreview3D({ shape, color, textureData, wireframe = false, roughness = 65, metallic = 5, emission = 0 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#1a1d1b')
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, .1, 30)
    camera.position.set(4.3, 3.2, 5.2)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.25
    controls.enablePan = false
    controls.minDistance = 3
    controls.maxDistance = 9
    controls.target.set(0, 0, 0)

    scene.add(new THREE.HemisphereLight('#d7e4dc', '#3a3026', 2.3))
    const key = new THREE.DirectionalLight('#ffe4aa', 3.5)
    key.position.set(4, 6, 5)
    key.castShadow = true
    scene.add(key)
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.35, .12, 48), new THREE.MeshStandardMaterial({ color: '#292e2a', roughness: .9 }))
    floor.position.y = -1.5
    floor.receiveShadow = true
    scene.add(floor)
    const grid = new THREE.GridHelper(4.2, 12, '#5c4b30', '#323733')
    grid.position.y = -1.43
    scene.add(grid)

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
    const resize = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    })
    resize.observe(mount)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      scene.clear()
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (modelRef.current) scene.remove(modelRef.current)
    const texture = textureFromPixels(textureData)
    const material = new THREE.MeshStandardMaterial({ color, map: texture, roughness: roughness / 100, metalness: metallic / 100, emissive: new THREE.Color(color), emissiveIntensity: emission / 180, wireframe })
    const model = buildModel(shape, material)
    scene.add(model)
    modelRef.current = model
  }, [color, emission, metallic, roughness, shape, textureData, wireframe])

  return <div className="object-preview-canvas" ref={mountRef} />
}
