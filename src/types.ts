export type Vec3 = [number, number, number]

export type ObjectKind = 'world' | 'sun' | 'ground' | 'player' | 'tree' | 'block' | 'spawn' | 'camera'

export interface SceneObject {
  id: string
  name: string
  kind: ObjectKind
  visible: boolean
  locked?: boolean
  parent?: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  color?: string
  material?: string
}

export interface AssetItem {
  id: string
  name: string
  type: 'block' | 'prefab' | 'script' | 'audio'
  color: string
  accent: string
  icon?: string
}
