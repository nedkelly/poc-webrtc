// Minimal in-memory signal store for offer/answer exchange.
// For production, swap to a durable store (e.g., Vercel KV/Redis).

type Signal = {
  offer?: string
  answer?: string
  updatedAt: number
}

const store = new Map<string, Signal>()
const TTL_MS = 15 * 60 * 1000

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

  if (req.method === 'GET') {
    const sessionId = (req.query.sessionId as string) || ''
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' })
      return
    }
    const data = store.get(sessionId)
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
      const current = store.get(sessionId) ?? { updatedAt: Date.now() }
      if (offer) current.offer = offer
      if (answer) current.answer = answer
      current.updatedAt = Date.now()
      store.set(sessionId, current)
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
