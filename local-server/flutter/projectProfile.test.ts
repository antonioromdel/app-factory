import { describe, expect, it } from 'vitest'
import {
  buildProjectProfile,
  githubRemote,
  parseAndroidGradle,
  parsePubspec,
  parseVersion,
} from './projectProfile.ts'

const pubspec = `
name: interval_master
description: A practice timer.
version: 1.4.2+18
environment:
  sdk: ^3.5.0
  flutter: ">=3.24.0"
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.0
  provider: ^6.0.0
  firebase_auth: ^5.0.0
  cloud_firestore: ^5.0.0
  google_mobile_ads: ^5.0.0
  purchases_flutter: ^8.0.0
`

describe('project profile parser', () => {
  it('reads the version, the build and the packages that fill the tabs', () => {
    const parsed = parsePubspec(pubspec)
    expect(parsed.version).toBe('1.4.2')
    expect(parsed.buildNumber).toBe(18)
    expect(parsed.description).toBe('A practice timer.')
    expect(parsed.dartSdk).toBe('^3.5.0')
    expect(parsed.flutterSdk).toBe('>=3.24.0')
    expect(parsed.firebaseServices).toEqual(['authentication', 'firestore'])
    expect(parsed.packages.has('google_mobile_ads')).toBe(true)
  })

  it('splits a missing build as 1 and keeps a zero build usable', () => {
    expect(parseVersion('2.0.0')).toEqual({ version: '2.0.0', buildNumber: 1 })
    expect(parseVersion('2.0.0+0')).toEqual({
      version: '2.0.0',
      buildNumber: 1,
    })
  })

  it('reads Android ids and ignores the test bundle id', () => {
    expect(
      parseAndroidGradle(`
        namespace = "com.example.interval"
        applicationId = "com.example.interval"
        minSdk = 24
      `),
    ).toEqual({ applicationId: 'com.example.interval', minSdk: '24' })
  })

  it('turns a GitHub remote into a repository link', () => {
    expect(githubRemote('git@github.com:antonioromdel/interval.git')).toEqual({
      githubUrl: 'https://github.com/antonioromdel/interval',
      repositoryName: 'interval',
    })
    expect(
      githubRemote('https://gitlab.com/antonioromdel/interval.git'),
    ).toBeUndefined()
  })

  it('assembles the fields used by the application tabs', () => {
    const profile = buildProjectProfile({
      pubspec,
      androidGradle: 'applicationId = "com.example.interval"\nminSdk = 24',
      pbxproj: `
        PRODUCT_BUNDLE_IDENTIFIER = com.example.interval.RunnerTests;
        PRODUCT_BUNDLE_IDENTIFIER = com.example.interval;
        IPHONEOS_DEPLOYMENT_TARGET = 15.0;
      `,
      gitConfig:
        '[remote "origin"]\n\turl = https://github.com/antonioromdel/interval.git\n',
      googleServices: JSON.stringify({
        project_info: { project_number: 4242, project_id: 'interval-master' },
        client: [{ client_info: { mobilesdk_app_id: '1:4242:android:abc' } }],
      }),
      iosPlist:
        '<key>GOOGLE_APP_ID</key><string>1:4242:ios:def</string><key>PROJECT_ID</key><string>interval-master</string>',
      androidManifest:
        '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-1"/>',
      fvm: '{"flutter":"3.24.5"}',
      firebaseJson: '{"firestore":{},"functions":{}}',
      hasAndroid: true,
      hasIos: true,
    })

    expect(profile.packageName).toBe('com.example.interval')
    expect(profile.bundleId).toBe('com.example.interval')
    expect(profile.minimumAndroidSdk).toBe('24')
    expect(profile.iosDeploymentTarget).toBe('15.0')
    expect(profile.stateManagement).toBe('Riverpod')
    expect(profile.flutterVersion).toBe('3.24.5')
    expect(profile.platforms).toEqual(['android', 'ios'])
    expect(profile.githubUrl).toBe('https://github.com/antonioromdel/interval')
    expect(profile.firebaseProjectId).toBe('interval-master')
    expect(profile.firebaseProjectNumber).toBe('4242')
    expect(profile.firebaseAndroidAppId).toBe('1:4242:android:abc')
    expect(profile.firebaseIosAppId).toBe('1:4242:ios:def')
    expect(profile.firebaseServices).toEqual([
      'authentication',
      'firestore',
      'functions',
    ])
    expect(profile.admobAppId).toBe('ca-app-pub-1')
    expect(profile.admob).toBe(true)
    expect(profile.revenueCat).toBe(true)
    expect(profile.inAppPurchases).toBe(true)
  })
})
