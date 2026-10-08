import { isIconSourceType } from '@/features/assets/iconSizes.ts'
import {
  android12SafeDiameter,
  android12SplashSize,
  maximumSplashLogo,
  minimumSplashLogo,
  recommendedSplashLogo,
  splashConfiguration,
  splashDensities,
  type SplashAlignment,
  type SplashFileId,
} from '@/features/assets/splashConfig.ts'

export type SplashLogoProblem = 'not-image' | 'too-small'

export interface SplashLogo {
  image: HTMLImageElement
  previewUrl: string
  width: number
  height: number
  limited: boolean
  small: boolean
  problem: SplashLogoProblem | null
}

export interface SplashFile {
  id: SplashFileId
  fileName: string
  blob: Blob
  url: string
}

export interface SplashOutput {
  files: SplashFile[]
  configuration: string
}

export async function readSplashLogo(file: File): Promise<SplashLogo> {
  if (file.type && !isIconSourceType(file.type)) {
    return emptyLogo('not-image')
  }

  const previewUrl = URL.createObjectURL(file)
  let image: HTMLImageElement
  try {
    image = await loadImage(previewUrl)
  } catch {
    URL.revokeObjectURL(previewUrl)
    return emptyLogo('not-image')
  }

  const width = image.naturalWidth
  const height = image.naturalHeight
  if (width < 1 || height < 1) {
    URL.revokeObjectURL(previewUrl)
    return emptyLogo('not-image')
  }

  const shortest = Math.min(width, height)
  return {
    image,
    previewUrl,
    width,
    height,
    limited: width > maximumSplashLogo || height > maximumSplashLogo,
    small: shortest < recommendedSplashLogo,
    problem: shortest < minimumSplashLogo ? 'too-small' : null,
  }
}

export async function generateSplash(
  logo: SplashLogo,
  color: string,
  alignment: SplashAlignment,
): Promise<SplashOutput> {
  if (logo.problem || !isHexColor(color)) {
    throw new Error('splash')
  }

  const master = logoCanvas(logo.image)
  const files: SplashFile[] = [await pngFile('splash', 'splash.png', master)]

  for (const density of splashDensities) {
    const width = Math.max(1, Math.round((master.width * density.scale) / 4))
    const height = Math.max(1, Math.round((master.height * density.scale) / 4))
    files.push(
      await pngFile(
        `android-${density.id}`,
        `android-${density.id}-splash.png`,
        scaledCanvas(master, width, height),
      ),
    )
  }

  files.push(
    await pngFile(
      'android12',
      'android12-splash.png',
      android12Canvas(master, color),
    ),
  )

  const configuration = splashConfiguration(color, alignment)
  const configBlob = new Blob([configuration], { type: 'text/yaml' })
  files.push({
    id: 'config',
    fileName: 'flutter_native_splash.yaml',
    blob: configBlob,
    url: URL.createObjectURL(configBlob),
  })

  return { files, configuration }
}

export function downloadSplashFile(file: SplashFile): void {
  downloadBlob(file.blob, file.fileName)
}

export function downloadSplashFiles(files: SplashFile[]): void {
  for (const file of files) {
    downloadBlob(file.blob, file.fileName)
  }
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function emptyLogo(problem: SplashLogoProblem): SplashLogo {
  return {
    image: new Image(),
    previewUrl: '',
    width: 0,
    height: 0,
    limited: false,
    small: false,
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

function logoCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(
    1,
    maximumSplashLogo / image.naturalWidth,
    maximumSplashLogo / image.naturalHeight,
  )
  return draw(
    image,
    Math.max(1, Math.round(image.naturalWidth * scale)),
    Math.max(1, Math.round(image.naturalHeight * scale)),
  )
}

function android12Canvas(
  logo: HTMLCanvasElement,
  color: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = android12SplashSize
  canvas.height = android12SplashSize
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('canvas')
  }

  context.fillStyle = color
  context.fillRect(0, 0, android12SplashSize, android12SplashSize)
  const scale = Math.min(
    android12SafeDiameter / logo.width,
    android12SafeDiameter / logo.height,
    1,
  )
  const width = Math.max(1, Math.round(logo.width * scale))
  const height = Math.max(1, Math.round(logo.height * scale))
  const fitted = scaledCanvas(logo, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    fitted,
    Math.round((android12SplashSize - width) / 2),
    Math.round((android12SplashSize - height) / 2),
    width,
    height,
  )
  return canvas
}

function scaledCanvas(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  let current = source

  while (current.width / width > 2 || current.height / height > 2) {
    const nextWidth = Math.max(width, Math.round(current.width / 2))
    const nextHeight = Math.max(height, Math.round(current.height / 2))
    if (nextWidth === current.width && nextHeight === current.height) {
      break
    }
    current = draw(current, nextWidth, nextHeight)
  }

  return draw(current, width, height)
}

function draw(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('canvas')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, width, height)
  return canvas
}

async function pngFile(
  id: SplashFileId,
  fileName: string,
  canvas: HTMLCanvasElement,
): Promise<SplashFile> {
  const blob = await canvasToPng(canvas)
  return { id, fileName, blob, url: URL.createObjectURL(blob) }
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
