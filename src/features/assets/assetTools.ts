export const assetToolIds = ['icons', 'splash', 'project', 'library'] as const

export type AssetToolId = (typeof assetToolIds)[number]

export function assetToolFromPath(pathname: string): AssetToolId | undefined {
  const match = /^\/assets\/([^/]+)$/.exec(pathname)
  const id = match?.[1]
  return assetToolIds.find((tool) => tool === id)
}
