export const minimumIconSource = 1024
export const maximumIconWorkingSize = 4096

export const iconGroups = ['android', 'ios', 'store'] as const

export type IconGroup = (typeof iconGroups)[number]

export const iconSizes = [
  {
    id: 'android-mdpi',
    group: 'android',
    pixels: 48,
    fileName: 'android-mdpi-48.png',
  },
  {
    id: 'android-hdpi',
    group: 'android',
    pixels: 72,
    fileName: 'android-hdpi-72.png',
  },
  {
    id: 'android-xhdpi',
    group: 'android',
    pixels: 96,
    fileName: 'android-xhdpi-96.png',
  },
  {
    id: 'android-xxhdpi',
    group: 'android',
    pixels: 144,
    fileName: 'android-xxhdpi-144.png',
  },
  {
    id: 'android-xxxhdpi',
    group: 'android',
    pixels: 192,
    fileName: 'android-xxxhdpi-192.png',
  },
  {
    id: 'android-adaptive-mdpi',
    group: 'android',
    pixels: 108,
    fileName: 'android-adaptive-mdpi-108.png',
  },
  {
    id: 'android-adaptive-hdpi',
    group: 'android',
    pixels: 162,
    fileName: 'android-adaptive-hdpi-162.png',
  },
  {
    id: 'android-adaptive-xhdpi',
    group: 'android',
    pixels: 216,
    fileName: 'android-adaptive-xhdpi-216.png',
  },
  {
    id: 'android-adaptive-xxhdpi',
    group: 'android',
    pixels: 324,
    fileName: 'android-adaptive-xxhdpi-324.png',
  },
  {
    id: 'android-adaptive-xxxhdpi',
    group: 'android',
    pixels: 432,
    fileName: 'android-adaptive-xxxhdpi-432.png',
  },
  { id: 'ios-20-1x', group: 'ios', pixels: 20, fileName: 'ios-20@1x.png' },
  { id: 'ios-20-2x', group: 'ios', pixels: 40, fileName: 'ios-20@2x.png' },
  { id: 'ios-20-3x', group: 'ios', pixels: 60, fileName: 'ios-20@3x.png' },
  { id: 'ios-29-1x', group: 'ios', pixels: 29, fileName: 'ios-29@1x.png' },
  { id: 'ios-29-2x', group: 'ios', pixels: 58, fileName: 'ios-29@2x.png' },
  { id: 'ios-29-3x', group: 'ios', pixels: 87, fileName: 'ios-29@3x.png' },
  { id: 'ios-40-1x', group: 'ios', pixels: 40, fileName: 'ios-40@1x.png' },
  { id: 'ios-40-2x', group: 'ios', pixels: 80, fileName: 'ios-40@2x.png' },
  { id: 'ios-40-3x', group: 'ios', pixels: 120, fileName: 'ios-40@3x.png' },
  { id: 'ios-60-2x', group: 'ios', pixels: 120, fileName: 'ios-60@2x.png' },
  { id: 'ios-60-3x', group: 'ios', pixels: 180, fileName: 'ios-60@3x.png' },
  { id: 'ios-76-1x', group: 'ios', pixels: 76, fileName: 'ios-76@1x.png' },
  { id: 'ios-76-2x', group: 'ios', pixels: 152, fileName: 'ios-76@2x.png' },
  { id: 'ios-83-2x', group: 'ios', pixels: 167, fileName: 'ios-83.5@2x.png' },
  {
    id: 'store-play',
    group: 'store',
    pixels: 512,
    fileName: 'play-store-512.png',
  },
  {
    id: 'store-app-store',
    group: 'store',
    pixels: 1024,
    fileName: 'app-store-1024.png',
  },
] as const

export type IconSizeId = (typeof iconSizes)[number]['id']

const sourceTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function isIconSourceType(type: string): boolean {
  return sourceTypes.has(type)
}
