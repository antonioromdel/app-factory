import {
  iconSizes,
  isIconSourceType,
  maximumIconWorkingSize,
  minimumIconSource,
  type IconSizeId,
} from '@/features/assets/iconSizes.ts'

export type IconSourceProblem = 'not-image' | 'not-square' | 'too-small'

export interface IconSource {
  image: HTMLImageElement
  previewUrl: string
  width: number
  height: number
  transparent: boolean
  limited: boolean
  problem: IconSourceProblem | null
}

export interface GeneratedIcon {
  id: IconSizeId
  fileName: string
  pixels: number
  blob: Blob
  url: string
}

export async function readIconSource(file: File): Promise<IconSource> {
  if (file.type && !isIconSourceType(file.type)) {
    return emptySource('not-image')
  }

  const previewUrl = URL.createObjectURL(file)
  let image: HTMLImageElement
  try {
    image = await loadImage(previewUrl)
  } catch {
    URL.revokeObjectURL(previewUrl)
    return emptySource('not-image')
  }

  const width = image.naturalWidth
  const height = image.naturalHeight
  if (width < 1 || height < 1) {
    URL.revokeObjectURL(previewUrl)
    return emptySource('not-image')
  }

  const problem =
    width !== height
      ? 'not-square'
      : width < minimumIconSource
        ? 'too-small'
        : null

  return {
    image,
    previewUrl,
    width,
    height,
    transparent: await sourceHasTransparency(image, width, height),
    limited: width > maximumIconWorkingSize,
    problem,
  }
}

export async function generateIcons(
  source: IconSource,
): Promise<GeneratedIcon[]> {
  if (source.problem) {
    return []
  }

  const working = workingCanvas(source.image, source.width)
  const icons: GeneratedIcon[] = []

  for (const size of iconSizes) {
    const canvas = resizeCanvas(working, size.pixels)
    const blob = await canvasToPng(canvas)
    icons.push({
      id: size.id,
      fileName: size.fileName,
      pixels: size.pixels,
      blob,
      url: URL.createObjectURL(blob),
    })
  }

  return icons
}

export function downloadGeneratedIcon(icon: GeneratedIcon): void {
  downloadBlob(icon.blob, icon.fileName)
}

export function downloadGeneratedIcons(icons: GeneratedIcon[]): void {
  for (const icon of icons) {
    downloadBlob(icon.blob, icon.fileName)
  }
}

function emptySource(problem: IconSourceProblem): IconSource {
  return {
    image: new Image(),
    previewUrl: '',
    width: 0,
    height: 0,
    transparent: false,
    limited: false,
    problem,
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('load'))
    image.src = url
  })
}

async function sourceHasTransparency(
  image: CanvasImageSource,
  width: number,
  height: number,
): Promise<boolean> {
  const tile = 128
  const canvas = document.createElement('canvas')
  canvas.width = tile
  canvas.height = tile
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return false
  }

  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const tileWidth = Math.min(tile, width - x)
      const tileHeight = Math.min(tile, height - y)
      context.clearRect(0, 0, tile, tile)
      context.drawImage(
        image,
        x,
        y,
        tileWidth,
        tileHeight,
        0,
        0,
        tileWidth,
        tileHeight,
      )
      const data = context.getImageData(0, 0, tileWidth, tileHeight).data
      for (let index = 3; index < data.length; index += 16) {
        const alpha = data[index]
        if (alpha !== undefined && alpha < 255) {
          return true
        }
      }
    }
  }

  return false
}

function workingCanvas(
  image: CanvasImageSource,
  size: number,
): HTMLCanvasElement {
  const workingSize = Math.min(size, maximumIconWorkingSize)
  return drawSquare(image, workingSize)
}

function resizeCanvas(
  source: HTMLCanvasElement,
  target: number,
): HTMLCanvasElement {
  let current = source

  // Halve until the last step so a large source is not shrunk to a tiny icon in one draw.
  while (current.width * 0.5 > target) {
    current = drawSquare(current, Math.round(current.width / 2))
  }

  if (current.width === target) {
    return drawSquare(current, target)
  }

  return drawSquare(current, target)
}

function drawSquare(
  source: CanvasImageSource,
  size: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('canvas')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, size, size)
  return canvas
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('blob'))
      }
    }, 'image/png')
  })
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
