import { readFile, readdir, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runCommand } from '../commands/run.ts'
import { inspectFlutterProject, runHealthCheck } from './health.ts'
import {
  checkDependencies,
  declaredPubspecVersion,
} from './releasePreparation.ts'

export const androidBuildProducts = ['debug-apk', 'release-apk', 'aab'] as const
export const iosBuildProducts = ['debug', 'release', 'ipa'] as const
export const buildProducts = [
  ...androidBuildProducts,
  ...iosBuildProducts,
] as const

export type AndroidBuildProduct = (typeof androidBuildProducts)[number]
export type IosBuildProduct = (typeof iosBuildProducts)[number]
export type BuildProduct = (typeof buildProducts)[number]
export type BuildPlatform = 'android' | 'ios'

export const androidBuildActions = [
  'flutter',
  'signing',
  'version',
  'dependencies',
  'analyze',
  'test',
  'build',
  'output',
] as const

export const iosBuildActions = [
  'flutter',
  'signing',
  'certificates',
  'provisioning',
  'version',
  'dependencies',
  'analyze',
  'test',
  'build',
  'output',
] as const

export type BuildAction =
  (typeof androidBuildActions)[number] | (typeof iosBuildActions)[number]

export type BuildReason =
  | 'unavailable'
  | 'debug-signing'
  | 'missing-signing'
  | 'missing-version'
  | 'missing-certificates'
  | 'missing-provisioning'
  | 'platform-missing'
  | 'timeout'
  | 'flutter-missing'
  | 'read-failed'
  | 'nothing-to-validate'

export type BuildStepResult = {
  status: 'success' | 'warning' | 'failed'
  output: string
  reason?: BuildReason
}

export type ProjectBuildResult =
  | ({ ok: true } & BuildStepResult)
  | {
      ok: false
      code:
        | 'invalid-directory'
        | 'directory-missing'
        | 'not-a-flutter-project'
        | 'invalid-build'
    }

const fileLimit = 1_000_000
const flutterTimeoutMs = 60_000
const buildTimeoutMs = 900_000

const buildArgs: Record<BuildProduct, string[]> = {
  'debug-apk': ['build', 'apk', '--debug'],
  'release-apk': ['build', 'apk', '--release'],
  aab: ['build', 'appbundle', '--release'],
  debug: ['build', 'ios', '--debug', '--no-codesign'],
  release: ['build', 'ios', '--release', '--no-codesign'],
  ipa: ['build', 'ipa', '--release'],
}

const artifactPath: Record<Exclude<BuildProduct, 'ipa'>, string> = {
  'debug-apk': path.join(
    'build',
    'app',
    'outputs',
    'flutter-apk',
    'app-debug.apk',
  ),
  'release-apk': path.join(
    'build',
    'app',
    'outputs',
    'flutter-apk',
    'app-release.apk',
  ),
  aab: path.join(
    'build',
    'app',
    'outputs',
    'bundle',
    'release',
    'app-release.aab',
  ),
  debug: path.join('build', 'ios', 'Debug-iphoneos', 'Runner.app'),
  release: path.join('build', 'ios', 'iphoneos', 'Runner.app'),
}

export function keyPropertiesReady(source: string): boolean {
  return ['storePassword', 'keyPassword', 'keyAlias', 'storeFile'].every(
    (key) => {
      const match = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, 'm').exec(
        source,
      )
      const value = match?.[1]?.trim() ?? ''
      return value.length > 0 && value !== '""' && value !== "''"
    },
  )
}

export function gradleHasReleaseSigning(source: string): boolean {
  const block = blockAfter(source, 'signingConfigs')
  if (!block) {
    return false
  }
  const hasRelease =
    /\brelease\s*\{/.test(block) ||
    /create\(\s*["']release["']\s*\)/.test(block)
  const uses =
    /signingConfig\s+signingConfigs\.release\b/.test(source) ||
    /signingConfig\s*=\s*signingConfigs\.release\b/.test(source) ||
    /signingConfig\s*=\s*signingConfigs\.getByName\(\s*["']release["']\s*\)/.test(
      source,
    )
  return hasRelease && uses
}

export function androidSigningResult(
  product: AndroidBuildProduct,
  gradle: string,
  keyProperties: string | null,
): BuildStepResult {
  if (product === 'debug-apk') {
    return { status: 'success', output: '', reason: 'debug-signing' }
  }
  const ready =
    keyProperties !== null &&
    keyPropertiesReady(keyProperties) &&
    gradleHasReleaseSigning(gradle)
  if (!ready) {
    return { status: 'failed', output: '', reason: 'missing-signing' }
  }
  return { status: 'success', output: 'android/key.properties' }
}

export function readIosSigning(source: string): {
  team: boolean
  manual: boolean
  profileSpecifier: boolean
} {
  return {
    team: assignedValue(source, 'DEVELOPMENT_TEAM'),
    manual: /CODE_SIGN_STYLE = Manual;/.test(source),
    profileSpecifier: assignedValue(source, 'PROVISIONING_PROFILE_SPECIFIER'),
  }
}

export function iosSigningResult(
  product: IosBuildProduct,
  project: string | null,
): BuildStepResult {
  if (project === null) {
    return { status: 'failed', output: '', reason: 'platform-missing' }
  }
  const signing = readIosSigning(project)
  if (!signing.team) {
    return {
      status: product === 'ipa' ? 'failed' : 'warning',
      output: '',
      reason: 'missing-signing',
    }
  }
  return { status: 'success', output: '' }
}

export function certificateResult(
  product: IosBuildProduct,
  host: 'darwin' | 'other',
  identityCount: number,
): BuildStepResult {
  if (host !== 'darwin') {
    return { status: 'warning', output: '', reason: 'unavailable' }
  }
  if (identityCount > 0) {
    return { status: 'success', output: String(identityCount) }
  }
  return {
    status: product === 'ipa' ? 'failed' : 'warning',
    output: '0',
    reason: 'missing-certificates',
  }
}

export function codesignIdentityCount(output: string): number {
  const match = /(\d+)\s+valid identities found/i.exec(output)
  return match?.[1] ? Number(match[1]) : 0
}

export function provisioningResult(
  product: IosBuildProduct,
  host: 'darwin' | 'other',
  profileCount: number,
  manual: boolean,
  profileSpecifier: boolean,
): BuildStepResult {
  if (host !== 'darwin') {
    return { status: 'warning', output: '', reason: 'unavailable' }
  }
  const present = profileCount > 0 || profileSpecifier
  if (product === 'ipa' && manual && !present) {
    return { status: 'failed', output: '0', reason: 'missing-provisioning' }
  }
  if (!present) {
    return {
      status: 'warning',
      output: String(profileCount),
      reason: 'missing-provisioning',
    }
  }
  return { status: 'success', output: String(profileCount) }
}

export function versionResult(declared: string | null): BuildStepResult {
  if (!declared) {
    return { status: 'failed', output: '', reason: 'missing-version' }
  }
  return { status: 'success', output: declared }
}

export function productForPlatform(
  platform: BuildPlatform,
  product: BuildProduct,
): boolean {
  if (platform === 'android') {
    return isAndroidProduct(product)
  }
  return isIosProduct(product)
}

function isAndroidProduct(
  product: BuildProduct,
): product is AndroidBuildProduct {
  return androidBuildProducts.some((item) => item === product)
}

function isIosProduct(product: BuildProduct): product is IosBuildProduct {
  return iosBuildProducts.some((item) => item === product)
}

export async function runProjectBuild(input: {
  directory: unknown
  platform: unknown
  product: unknown
  action: unknown
  built: unknown
}): Promise<ProjectBuildResult> {
  const platform =
    input.platform === 'android' || input.platform === 'ios'
      ? input.platform
      : null
  const product = buildProducts.find((item) => item === input.product) ?? null
  const action = readAction(platform, input.action)
  if (
    !platform ||
    !product ||
    !action ||
    !productForPlatform(platform, product)
  ) {
    return { ok: false, code: 'invalid-build' }
  }

  const project = await inspectFlutterProject(input.directory)
  if (!project.ok) {
    return project
  }

  const built = input.built === true
  const step = await runStep(
    project.directory,
    platform,
    product,
    action,
    built,
  )
  return { ok: true, ...step }
}

async function runStep(
  directory: string,
  platform: BuildPlatform,
  product: BuildProduct,
  action: BuildAction,
  built: boolean,
): Promise<BuildStepResult> {
  if (action === 'flutter') {
    return flutterStep(directory)
  }
  if (action === 'signing') {
    return platform === 'android'
      ? androidSigningStep(directory, product)
      : iosSigningStep(directory, product)
  }
  if (action === 'certificates') {
    return certificateStep(product)
  }
  if (action === 'provisioning') {
    return provisioningStep(directory, product)
  }
  if (action === 'version') {
    const source = await readText(path.join(directory, 'pubspec.yaml'))
    return versionResult(source ? declaredPubspecVersion(source) : null)
  }
  if (action === 'dependencies') {
    const result = await checkDependencies(directory)
    if (!result.ok) {
      return { status: 'failed', output: '', reason: 'read-failed' }
    }
    const reason =
      result.reason === 'timeout' ||
      result.reason === 'flutter-missing' ||
      result.reason === 'read-failed'
        ? result.reason
        : undefined
    return {
      status: result.status,
      output: result.output,
      ...(reason ? { reason } : {}),
    }
  }
  if (action === 'analyze' || action === 'test') {
    return healthStep(directory, action)
  }
  if (action === 'build') {
    return buildStep(directory, platform, product)
  }
  if (!built) {
    return { status: 'warning', output: '', reason: 'nothing-to-validate' }
  }
  return outputStep(directory, product)
}

async function flutterStep(directory: string): Promise<BuildStepResult> {
  const result = await runCommand('flutter', ['--version'], {
    cwd: directory,
    timeoutMs: flutterTimeoutMs,
  })
  if (result.ok) {
    return { status: 'success', output: result.output.trim() }
  }
  return commandFailure(result)
}

async function androidSigningStep(
  directory: string,
  product: BuildProduct,
): Promise<BuildStepResult> {
  if (!isAndroidProduct(product)) {
    return { status: 'failed', output: '', reason: 'platform-missing' }
  }
  if (!(await directoryExists(path.join(directory, 'android')))) {
    return { status: 'failed', output: '', reason: 'platform-missing' }
  }
  const gradle = [
    await readText(path.join(directory, 'android', 'app', 'build.gradle')),
    await readText(path.join(directory, 'android', 'app', 'build.gradle.kts')),
  ]
    .filter((item): item is string => item !== null)
    .join('\n')
  const keyProperties = await readText(
    path.join(directory, 'android', 'key.properties'),
  )
  return androidSigningResult(product, gradle, keyProperties)
}

async function iosSigningStep(
  directory: string,
  product: BuildProduct,
): Promise<BuildStepResult> {
  if (!isIosProduct(product)) {
    return { status: 'failed', output: '', reason: 'platform-missing' }
  }
  const project = await readText(
    path.join(directory, 'ios', 'Runner.xcodeproj', 'project.pbxproj'),
  )
  return iosSigningResult(product, project)
}

async function certificateStep(
  product: BuildProduct,
): Promise<BuildStepResult> {
  if (!isIosProduct(product)) {
    return { status: 'failed', output: '', reason: 'platform-missing' }
  }
  if (process.platform !== 'darwin') {
    return certificateResult(product, 'other', 0)
  }
  const result = await runCommand(
    'security',
    ['find-identity', '-v', '-p', 'codesigning'],
    { timeoutMs: flutterTimeoutMs },
  )
  const count =
    result.ok || result.code === 'failed'
      ? codesignIdentityCount(result.output)
      : 0
  if (!result.ok && result.code === 'missing') {
    return { status: 'warning', output: '', reason: 'unavailable' }
  }
  return certificateResult(product, 'darwin', count)
}

async function provisioningStep(
  directory: string,
  product: BuildProduct,
): Promise<BuildStepResult> {
  if (!isIosProduct(product)) {
    return { status: 'failed', output: '', reason: 'platform-missing' }
  }
  const project = await readText(
    path.join(directory, 'ios', 'Runner.xcodeproj', 'project.pbxproj'),
  )
  const signing = project ? readIosSigning(project) : null
  const host = process.platform === 'darwin' ? 'darwin' : 'other'
  const profileCount = host === 'darwin' ? await installedProfiles() : 0
  return provisioningResult(
    product,
    host,
    profileCount,
    signing?.manual ?? false,
    signing?.profileSpecifier ?? false,
  )
}

async function healthStep(
  directory: string,
  check: 'analyze' | 'test',
): Promise<BuildStepResult> {
  const result = await runHealthCheck(directory, check)
  if (!result.ok) {
    return { status: 'failed', output: '', reason: 'read-failed' }
  }
  return {
    status: result.status === 'passed' ? 'success' : result.status,
    output: result.output,
  }
}

async function buildStep(
  directory: string,
  platform: BuildPlatform,
  product: BuildProduct,
): Promise<BuildStepResult> {
  if (platform === 'ios' && process.platform !== 'darwin') {
    return { status: 'warning', output: '', reason: 'unavailable' }
  }
  const result = await runCommand('flutter', buildArgs[product], {
    cwd: directory,
    timeoutMs: buildTimeoutMs,
  })
  if (result.ok) {
    return { status: 'success', output: result.output.trim() }
  }
  return commandFailure(result)
}

async function outputStep(
  directory: string,
  product: BuildProduct,
): Promise<BuildStepResult> {
  const found = await findArtifact(directory, product)
  if (!found) {
    return {
      status: 'failed',
      output: product === 'ipa' ? 'build/ios/ipa/*.ipa' : artifactPath[product],
    }
  }
  return { status: 'success', output: found }
}

async function findArtifact(
  directory: string,
  product: BuildProduct,
): Promise<string | null> {
  if (product === 'ipa') {
    const folder = path.join(directory, 'build', 'ios', 'ipa')
    try {
      const entries = await readdir(folder, { withFileTypes: true })
      const file = entries.find(
        (entry) => entry.isFile() && entry.name.endsWith('.ipa'),
      )
      return file ? path.join('build', 'ios', 'ipa', file.name) : null
    } catch {
      return null
    }
  }

  const relative = artifactPath[product]
  try {
    const info = await stat(path.join(directory, relative))
    const ready =
      product === 'debug' || product === 'release'
        ? info.isDirectory()
        : info.isFile()
    return ready ? relative : null
  } catch {
    return null
  }
}

async function installedProfiles(): Promise<number> {
  const folder = path.join(
    os.homedir(),
    'Library',
    'MobileDevice',
    'Provisioning Profiles',
  )
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith('.mobileprovision'),
    ).length
  } catch {
    return 0
  }
}

function readAction(
  platform: BuildPlatform | null,
  value: unknown,
): BuildAction | null {
  const actions = platform === 'ios' ? iosBuildActions : androidBuildActions
  return actions.find((item) => item === value) ?? null
}

function commandFailure(result: {
  code: 'missing' | 'failed' | 'timeout'
  output: string
}): BuildStepResult {
  if (result.code === 'timeout') {
    return { status: 'failed', output: result.output.trim(), reason: 'timeout' }
  }
  if (result.code === 'missing') {
    return {
      status: 'failed',
      output: result.output.trim(),
      reason: 'flutter-missing',
    }
  }
  return { status: 'failed', output: result.output.trim() }
}

function assignedValue(source: string, name: string): boolean {
  const pattern = new RegExp(`${name} = ([^;]+);`, 'g')
  return [...source.matchAll(pattern)].some((match) => {
    const value = match[1]?.trim() ?? ''
    return value.length > 0 && value !== '""' && value !== "''"
  })
}

function blockAfter(source: string, keyword: string): string | null {
  const start = source.indexOf(keyword)
  if (start < 0) {
    return null
  }
  const brace = source.indexOf('{', start)
  if (brace < 0) {
    return null
  }
  let depth = 0
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index]
    if (character === '{') {
      depth += 1
    }
    if (character === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(brace, index + 1)
      }
    }
  }
  return null
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    const info = await stat(directory)
    return info.isDirectory()
  } catch {
    return false
  }
}

async function readText(file: string): Promise<string | null> {
  try {
    const info = await stat(file)
    if (!info.isFile() || info.size > fileLimit) {
      return null
    }
    return await readFile(file, 'utf8')
  } catch {
    return null
  }
}
