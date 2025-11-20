// Signal store for offer/answer exchange.
// Uses Vercel KV if configured; falls back to in-memory with TTL otherwise.

type Signal = {
  offer?: string
  answer?: string
  updatedAt: number
}

const store = new Map<string, Signal>()
const TTL_MS = 15 * 60 * 1000

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const KV_NAMESPACE = process.env.KV_NAMESPACE ?? 'signal'

async function kvGet(sessionId: string) {
  if (!KV_URL || !KV_TOKEN) return null
  try {
    const res = await fetch(`${KV_URL}/rest/get/${KV_NAMESPACE}:${sessionId}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: Signal | null }
    return data?.result ?? null
  } catch {
    return null
  }
}

async function kvSet(sessionId: string, payload: Signal) {
  if (!KV_URL || !KV_TOKEN) return false
  try {
    const res = await fetch(`${KV_URL}/rest/set/${KV_NAMESPACE}:${sessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: payload, ex: Math.floor(TTL_MS / 1000) }),
    })
    return res.ok
  } catch {
    return false
  }
}

function cleanup() {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now - value.updatedAt > TTL_MS) {
      store.delete(key)
    }
  }
}

export default async function handler(req: any, res: any) {
  cleanup()
   res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const sessionId = (req.query.sessionId as string) || ''
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' })
      return
    }
    const data = (await kvGet(sessionId)) ?? store.get(sessionId)
    res.status(200).json({
      offer: data?.offer ?? null,
      answer: data?.answer ?? null,
    })
    return
  }

  if (req.method === 'POST') {
    try {
      const { sessionId, offer, answer } = req.body ?? {}
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId required' })
        return
      }
      const current =
        (await kvGet(sessionId)) ?? store.get(sessionId) ?? { updatedAt: Date.now() }
      if (offer) current.offer = offer
      if (answer) current.answer = answer
      current.updatedAt = Date.now()
      store.set(sessionId, current)
      await kvSet(sessionId, current)
      res.status(200).json({ ok: true })
    } catch (error) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'error' })
    }
    return
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).end('Method Not Allowed')
}
