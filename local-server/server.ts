import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { createFlutterProject, planFlutterCreate } from './createProject.ts'
import { publicFlutterTemplates } from './templates.ts'

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
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && url.pathname === '/flutter/templates') {
    sendJson(response, 200, { templates: publicFlutterTemplates() })
    return
  }

  if (request.method === 'POST' && url.pathname === '/flutter/create') {
    await handleCreate(request, response)
    return
  }

  sendJson(response, 404, { ok: false, code: 'invalid-request' })
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
