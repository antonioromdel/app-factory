import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import {
  applicationInputFrom,
  mergeProjectProfile,
  releasePlatformOf,
  sameApplicationInput,
  type ProjectProfile,
} from '@/features/flutter/projectProfile.ts'
import type { Application } from '@/types/application.ts'

const stamp = new Timestamp(1_700_000_000, 0)

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app',
    name: 'Interval',
    createdAt: stamp,
    updatedAt: stamp,
    repository: { localPath: 'C:\\apps\\interval' },
    notes: { technicalNotes: 'Keep this' },
    ...overrides,
  }
}

function profile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    platforms: ['android', 'ios'],
    firebaseServices: [],
    admob: false,
    inAppPurchases: false,
    revenueCat: false,
    ...overrides,
  }
}

describe('linked project merge', () => {
  it('fills empty tabs and keeps notes and an existing store version', () => {
    const current = application({
      googlePlay: { currentVersion: '1.0.0', storeUrl: 'https://play.example' },
      firebase: { enabledServices: ['storage'] },
    })
    const next = mergeProjectProfile(
      current,
      profile({
        version: '1.4.2',
        buildNumber: 18,
        packageName: 'com.example.interval',
        bundleId: 'com.example.interval',
        description: 'A practice timer.',
        firebaseProjectId: 'interval-master',
        firebaseServices: ['authentication'],
        admob: true,
        admobAppId: 'ca-app-pub-1',
        githubUrl: 'https://github.com/antonioromdel/interval',
        repositoryName: 'interval',
      }),
      'C:\\apps\\interval',
    )

    expect(next.description).toBe('A practice timer.')
    expect(next.notes).toEqual({ technicalNotes: 'Keep this' })
    expect(next.flutter?.packageName).toBe('com.example.interval')
    expect(next.flutter?.bundleId).toBe('com.example.interval')
    expect(next.googlePlay?.currentVersion).toBe('1.0.0')
    expect(next.googlePlay?.storeUrl).toBe('https://play.example')
    expect(next.appStore?.currentVersion).toBe('1.4.2')
    expect(next.firebase?.projectId).toBe('interval-master')
    expect(next.firebase?.enabledServices).toEqual([
      'authentication',
      'storage',
    ])
    expect(next.firebase?.consoleUrl).toBe(
      'https://console.firebase.google.com/project/interval-master',
    )
    expect(next.admob?.appId).toBe('ca-app-pub-1')
    expect(next.monetization?.admob).toBe(true)
    expect(next.repository?.githubUrl).toBe(
      'https://github.com/antonioromdel/interval',
    )
    expect(next.name).toBe('Interval')
  })

  it('does not rewrite an application that already matches the project', () => {
    const current = application({
      description: 'A practice timer.',
      flutter: { packageName: 'com.example.interval' },
    })
    const merged = mergeProjectProfile(
      current,
      profile({
        platforms: [],
        description: 'Something else',
        packageName: 'com.example.interval',
      }),
      'C:\\apps\\interval',
    )
    expect(sameApplicationInput(merged, applicationInputFrom(current))).toBe(
      true,
    )
  })

  it('uses a single platform when the project only has Android', () => {
    expect(releasePlatformOf(profile({ platforms: ['android'] }))).toBe(
      'android',
    )
  })
})
