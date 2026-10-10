import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  androidSigningResult,
  certificateResult,
  codesignIdentityCount,
  gradleHasReleaseSigning,
  iosSigningResult,
  keyPropertiesReady,
  provisioningResult,
  runProjectBuild,
  versionResult,
} from './projectBuild.ts'

const secret = 'super-secret-password'
const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

const releaseGradle = `
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        storeFile file(keystoreProperties['storeFile'])
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
`

const keyProperties = `storePassword=${secret}
keyPassword=${secret}
keyAlias=upload
storeFile=upload.jks
`

describe('android signing', () => {
  it('uses the debug keystore for a debug APK', () => {
    expect(androidSigningResult('debug-apk', '', null)).toEqual({
      status: 'success',
      output: '',
      reason: 'debug-signing',
    })
  })

  it('stops a release build when signing is missing and hides secrets', () => {
    const result = androidSigningResult(
      'aab',
      'buildTypes { release {} }',
      keyProperties,
    )
    expect(result).toEqual({
      status: 'failed',
      output: '',
      reason: 'missing-signing',
    })
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it('accepts a release keystore without returning its values', () => {
    expect(keyPropertiesReady(keyProperties)).toBe(true)
    expect(gradleHasReleaseSigning(releaseGradle)).toBe(true)
    const result = androidSigningResult(
      'release-apk',
      releaseGradle,
      keyProperties,
    )
    expect(result).toEqual({
      status: 'success',
      output: 'android/key.properties',
    })
    expect(JSON.stringify(result)).not.toContain(secret)
  })
})

describe('ios checks', () => {
  it('requires a team before an IPA and warns for a debug build', () => {
    expect(
      iosSigningResult('ipa', 'CODE_SIGN_STYLE = Automatic;'),
    ).toMatchObject({
      status: 'failed',
      reason: 'missing-signing',
    })
    expect(
      iosSigningResult('debug', 'CODE_SIGN_STYLE = Automatic;'),
    ).toMatchObject({
      status: 'warning',
      reason: 'missing-signing',
    })
  })

  it('counts signing identities and skips certificates outside macOS', () => {
    expect(codesignIdentityCount('     2 valid identities found\n')).toBe(2)
    expect(certificateResult('ipa', 'other', 0)).toEqual({
      status: 'warning',
      output: '',
      reason: 'unavailable',
    })
    expect(certificateResult('ipa', 'darwin', 0)).toMatchObject({
      status: 'failed',
      reason: 'missing-certificates',
    })
  })

  it('fails a manual IPA without a provisioning profile', () => {
    expect(provisioningResult('ipa', 'darwin', 0, true, false)).toMatchObject({
      status: 'failed',
      reason: 'missing-provisioning',
    })
    expect(provisioningResult('debug', 'other', 0, false, false)).toEqual({
      status: 'warning',
      output: '',
      reason: 'unavailable',
    })
  })
})

describe('version', () => {
  it('reads the pubspec version and fails when it is missing', () => {
    expect(versionResult('1.4.2+18')).toEqual({
      status: 'success',
      output: '1.4.2+18',
    })
    expect(versionResult(null)).toMatchObject({
      status: 'failed',
      reason: 'missing-version',
    })
  })
})

describe('runProjectBuild', () => {
  it('checks signing from the project files', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'af-build-'))
    directories.push(directory)
    await writeFile(
      path.join(directory, 'pubspec.yaml'),
      'name: demo\nversion: 1.4.2+18\n',
      'utf8',
    )
    await mkdir(path.join(directory, 'android', 'app'), { recursive: true })
    await writeFile(
      path.join(directory, 'android', 'app', 'build.gradle'),
      releaseGradle,
      'utf8',
    )
    await writeFile(
      path.join(directory, 'android', 'key.properties'),
      keyProperties,
      'utf8',
    )

    const signing = await runProjectBuild({
      directory,
      platform: 'android',
      product: 'release-apk',
      action: 'signing',
      built: false,
    })
    const version = await runProjectBuild({
      directory,
      platform: 'android',
      product: 'release-apk',
      action: 'version',
      built: false,
    })

    expect(signing).toMatchObject({ ok: true, status: 'success' })
    expect(JSON.stringify(signing)).not.toContain(secret)
    expect(version).toEqual({
      ok: true,
      status: 'success',
      output: '1.4.2+18',
    })
  })
})
