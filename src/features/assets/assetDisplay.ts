import type { ApplicationAsset, AssetCategory } from '@/types/asset.ts'
import { assetCategories } from '@/types/asset.ts'

export function assetSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function assetsInCategory(
  assets: ApplicationAsset[],
  category: AssetCategory,
): ApplicationAsset[] {
  return assets
    .filter((asset) => asset.category === category)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.createdAt.toMillis() - right.createdAt.toMillis() ||
        left.name.localeCompare(right.name),
    )
}

export function nextAssetOrder(
  assets: ApplicationAsset[],
  category: AssetCategory,
): number {
  return assetsInCategory(assets, category).reduce(
    (max, asset) => Math.max(max, asset.order),
    0,
  ) + 1
}

export function categoriesWithAssets(
  assets: ApplicationAsset[],
): AssetCategory[] {
  return assetCategories.filter(
    (category) => assetsInCategory(assets, category).length > 0,
  )
}
