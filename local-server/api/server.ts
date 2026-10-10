import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { checkEnvironment } from '../environment/check.ts'
import { openExistingDirectory } from '../filesystem/openDirectory.ts'
import { pickProjectDirectory } from '../filesystem/pickDirectory.ts'
import {
  createFlutterProject,
  planFlutterCreate,
} from '../flutter/createProject.ts'
import {
  listProjectDependencies,
  upgradeProjectDependency,
} from '../flutter/dependencies.ts'
import { inspectFlutterProject, runHealthCheck } from '../flutter/health.ts'
import { readProjectProfile } from '../flutter/readProjectProfile.ts'
import { runProjectBuild } from '../flutter/projectBuild.ts'
import {
  readPreparationInput,
  runReleasePreparation,
} from '../flutter/releasePreparation.ts'
import { publicFlutterCatalog } from '../flutter/templates.ts'

const host = '127.0.0.1'
const port = 3847
const bodyLimit = 16_384
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const server = createServer((request, response) => {
  void handleRequest(request, response)
})

server.listen(port, host, () => {
  console.log(`App Factory local helper at http://${host}:${port}`)
})

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const origin = request.headers.origin
  if (typeof origin === 'string' && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { ok: false, code: 'invalid-request' })
    return
  }

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${host}:${port}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      operations: [
        'flutter.templates',
        'flutter.create',
        'flutter.health',
        'flutter.inspect',
        'flutter.profile',
        'flutter.dependencies',
        'flutter.dependencies.upgrade',
        'flutter.release.prepare',
        'flutter.build',
        'filesystem.pickDirectory',
        'filesystem.open',
        'environment.check',
      ],
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/environment') {
    const report = await checkEnvironment()
    sendJson(response, 200, report)
    return
  }

  if (request.method === 'GET' && url.pathname === '/flutter/templates') {
    sendJson(response, 200, publicFlutterCatalog())
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/create') {
    await handleCreate(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/inspect') {
    await handleInspect(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/profile') {
    await handleProfile(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/health') {
    await handleHealth(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/dependencies') {
    await handleDependencies(request, response)
    return
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/flutter/dependencies/upgrade'
  ) {
    await handleDependencyUpgrade(request, response)
    return
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/flutter/release/prepare'
  ) {
    await handleReleasePreparation(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/build') {
    await handleProjectBuild(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/filesystem/open') {
    await handleOpenDirectory(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/pick-directory') {
    await handlePickDirectory(request, response)
    return
  }

  sendJson(response, 404, { ok: false, code: 'invalid-request' })
}

async function handleOpenDirectory(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown = {}
  try {
    const raw = await readBody(request)
    if (raw.trim()) {
      body = JSON.parse(raw)
    }
  } catch {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const directory =
    typeof body === 'object' && body !== null && 'path' in body
      ? body.path
      : undefined
  const result = await openExistingDirectory(directory)
  sendJson(
    response,
    result.ok ? 200 : result.code === 'open-failed' ? 500 : 400,
    result,
  )
}

async function handlePickDirectory(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown = {}
  try {
    const raw = await readBody(request)
    if (raw.trim()) {
      body = JSON.parse(raw)
    }
  } catch {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const start =
    typeof body === 'object' && body !== null && 'directory' in body
      ? body.directory
      : undefined
  const result = await pickProjectDirectory(start)
  sendJson(
    response,
    result.ok ? 200 : result.code === 'cancelled' ? 200 : 500,
    result,
  )
}

async function handleInspect(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown
  try {
    body = JSON.parse(await readBody(request))
  } catch {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const pathValue =
    typeof body === 'object' && body !== null && 'path' in body
      ? body.path
      : undefined
  const result = await inspectFlutterProject(pathValue)
  sendJson(response, result.ok ? 200 : 400, result)
}

async function handleProfile(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown
  try {
    body = JSON.parse(await readBody(request))
  } catch {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const pathValue =
    typeof body === 'object' && body !== null && 'path' in body
      ? body.path
      : undefined
  const result = await readProjectProfile(pathValue)
  sendJson(
    response,
    result.ok ? 200 : result.code === 'read-failed' ? 500 : 400,
    result,
  )
}

async function handleProjectBuild(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJsonBody(request)
  if (!body.ok || typeof body.value !== 'object' || body.value === null) {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const result = await runProjectBuild({
    directory: 'path' in body.value ? body.value.path : undefined,
    platform: 'platform' in body.value ? body.value.platform : undefined,
    product: 'product' in body.value ? body.value.product : undefined,
    action: 'action' in body.value ? body.value.action : undefined,
    built: 'built' in body.value ? body.value.built : undefined,
  })
  sendJson(response, result.ok ? 200 : 400, result)
}

async function handleReleasePreparation(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJsonBody(request)
  if (!body.ok) {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const pathValue =
    typeof body.value === 'object' &&
    body.value !== null &&
    'path' in body.value
      ? body.value.path
      : undefined
  const actionValue =
    typeof body.value === 'object' &&
    body.value !== null &&
    'action' in body.value
      ? body.value.action
      : undefined
  const input = readPreparationInput(body.value)
  if (!input) {
    sendJson(response, 400, { ok: false, code: 'invalid-release' })
    return
  }

  const result = await runReleasePreparation(pathValue, actionValue, input)
  sendJson(response, result.ok ? 200 : 400, result)
}

async function handleHealth(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown
  try {
    body = JSON.parse(await readBody(request))
  } catch {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const pathValue =
    typeof body === 'object' && body !== null && 'path' in body
      ? body.path
      : undefined
  const checkValue =
    typeof body === 'object' && body !== null && 'check' in body
      ? body.check
      : undefined
  const result = await runHealthCheck(pathValue, checkValue)
  sendJson(response, result.ok ? 200 : 400, result)
}

async function handleDependencies(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJsonBody(request)
  if (!body.ok) {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const pathValue =
    typeof body.value === 'object' &&
    body.value !== null &&
    'path' in body.value
      ? body.value.path
      : undefined
  const result = await listProjectDependencies(pathValue)
  sendJson(response, dependencyStatus(result), result)
}

async function handleDependencyUpgrade(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJsonBody(request)
  if (!body.ok) {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const pathValue =
    typeof body.value === 'object' &&
    body.value !== null &&
    'path' in body.value
      ? body.value.path
      : undefined
  const packageValue =
    typeof body.value === 'object' &&
    body.value !== null &&
    'package' in body.value
      ? body.value.package
      : undefined
  const result = await upgradeProjectDependency(pathValue, packageValue)
  sendJson(response, dependencyStatus(result), result)
}

function dependencyStatus(result: { ok: boolean; code?: string }): number {
  if (result.ok) {
    return 200
  }
  if (
    result.code === 'invalid-directory' ||
    result.code === 'directory-missing' ||
    result.code === 'not-a-flutter-project' ||
    result.code === 'invalid-package'
  ) {
    return 400
  }
  return 500
}

async function readJsonBody(
  request: IncomingMessage,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: JSON.parse(await readBody(request)) }
  } catch {
    return { ok: false }
  }
}

async function handleCreate(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown
  try {
    body = JSON.parse(await readBody(request))
  } catch {
    sendJson(response, 400, { ok: false, code: 'invalid-request' })
    return
  }

  const planned = await planFlutterCreate(body)
  if (!planned.ok) {
    sendJson(response, 400, { ok: false, code: planned.code })
    return
  }

  const result = await createFlutterProject(planned.plan)
  sendJson(response, result.ok ? 200 : 500, result)
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > bodyLimit) {
        reject(new Error('large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', reject)
  })
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}
