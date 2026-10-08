import type { Timestamp } from 'firebase/firestore'

export const assetCategories = [
  'appIcon',
  'androidIcons',
  'iosIcons',
  'splash',
  'screenshots',
  'featureGraphic',
  'storeImages',
  'logos',
] as const

export type AssetCategory = (typeof assetCategories)[number]

export const maxAssetBytes = 10 * 1024 * 1024

export const assetContentTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const

export type AssetContentType = (typeof assetContentTypes)[number]

export interface ApplicationAsset {
  id: string
  name: string
  category: AssetCategory
  contentType: string
  size: number
  storagePath: string
  url: string
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export function isAssetCategory(value: string): value is AssetCategory {
  return assetCategories.some((category) => category === value)
}

export function isAssetContentType(value: string): value is AssetContentType {
  return assetContentTypes.some((type) => type === value)
}
