export type Vec3 = [number, number, number]

export type ObjectKind = 'world' | 'sun' | 'ground' | 'player' | 'tree' | 'block' | 'spawn' | 'camera' | 'weapon' | 'item' | 'custom'
export type CustomShape = 'cube' | 'sword' | 'pickaxe' | 'item' | 'stairs'
export type ScriptLanguage = 'python' | 'java'

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
  customAssetId?: string
  shape?: CustomShape
  textureData?: string[]
  scriptLanguage?: ScriptLanguage
  pythonCode?: string
  javaCode?: string
  components?: string[]
  roughness?: number
  metallic?: number
  emission?: number
}

export interface AssetItem {
  id: string
  name: string
  type: 'block' | 'prefab' | 'script' | 'audio' | 'custom'
  color: string
  accent: string
  icon?: string
  shape?: CustomShape
  textureData?: string[]
  pythonCode?: string
  javaCode?: string
  components?: string[]
  roughness?: number
  metallic?: number
  emission?: number
}

export interface CustomAsset extends AssetItem {
  type: 'custom'
  shape: CustomShape
  textureData: string[]
  pythonCode: string
  javaCode: string
  components: string[]
}

export interface WorldSettings {
  seed: number
  chunkSize: number
  renderDistance: number
  biome: 'Meadow' | 'Highlands' | 'Desert'
  infinite: boolean
  weather: 'Clear' | 'Rain' | 'Snow' | 'Storm'
  weatherIntensity: number
  timeOfDay: number
  windSpeed: number
}
