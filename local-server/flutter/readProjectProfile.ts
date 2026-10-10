import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { inspectFlutterProject } from './health.ts'
import { buildProjectProfile, type ProjectProfile } from './projectProfile.ts'

const fileLimit = 1_000_000

export type ProjectProfileResult =
  | { ok: true; profile: ProjectProfile }
  | {
      ok: false
      code:
        | 'invalid-directory'
        | 'directory-missing'
        | 'not-a-flutter-project'
        | 'read-failed'
    }

export async function readProjectProfile(
  directoryValue: unknown,
): Promise<ProjectProfileResult> {
  const project = await inspectFlutterProject(directoryValue)
  if (!project.ok) {
    return project
  }

  try {
    const directory = project.directory
    const profile = buildProjectProfile({
      pubspec: await readRequired(path.join(directory, 'pubspec.yaml')),
      androidGradle: await readOptionalGradle(directory),
      pbxproj: await readOptional(
        path.join(directory, 'ios', 'Runner.xcodeproj', 'project.pbxproj'),
      ),
      gitConfig: await readOptional(path.join(directory, '.git', 'config')),
      googleServices: await readOptional(
        path.join(directory, 'android', 'app', 'google-services.json'),
      ),
      iosPlist: await readOptional(
        path.join(directory, 'ios', 'Runner', 'GoogleService-Info.plist'),
      ),
      androidManifest: await readOptional(
        path.join(
          directory,
          'android',
          'app',
          'src',
          'main',
          'AndroidManifest.xml',
        ),
      ),
      iosInfoPlist: await readOptional(
        path.join(directory, 'ios', 'Runner', 'Info.plist'),
      ),
      firebaseJson: await readOptional(path.join(directory, 'firebase.json')),
      fvm: await readFvm(directory),
      hasAndroid: await isDirectory(path.join(directory, 'android')),
      hasIos: await isDirectory(path.join(directory, 'ios')),
    })
    return { ok: true, profile }
  } catch {
    return { ok: false, code: 'read-failed' }
  }
}

async function readOptionalGradle(
  directory: string,
): Promise<string | undefined> {
  const kotlin = await readOptional(
    path.join(directory, 'android', 'app', 'build.gradle.kts'),
  )
  const groovy = await readOptional(
    path.join(directory, 'android', 'app', 'build.gradle'),
  )
  const text = [kotlin, groovy].filter((item) => item).join('\n')
  return text || undefined
}

async function readFvm(directory: string): Promise<string | undefined> {
  return (
    (await readOptional(path.join(directory, '.fvmrc'))) ??
    (await readOptional(path.join(directory, '.fvm', 'fvm_config.json')))
  )
}

async function readRequired(file: string): Promise<string> {
  const text = await readOptional(file)
  if (text === undefined) {
    throw new Error('missing')
  }
  return text
}

async function readOptional(file: string): Promise<string | undefined> {
  try {
    const info = await stat(file)
    if (!info.isFile() || info.size > fileLimit) {
      return undefined
    }
    return await readFile(file, 'utf8')
  } catch {
    return undefined
  }
}

async function isDirectory(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isDirectory()
  } catch {
    return false
  }
}
