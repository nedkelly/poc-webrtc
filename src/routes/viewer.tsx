import { useAtom, useSetAtom } from 'jotai'
import { Eye, RefreshCcw, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'react-qr-code'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'
import { useWebRTCSession } from '../hooks/useWebRTCSession'
import type { ConfigState, Message } from '../shared/protocol'
import { defaultConfig } from '../shared/protocol'
import {
  eventLogAtom,
  sessionStatusAtom,
  viewerConfigAtom,
} from '../state/config'

export default function Viewer() {
  const [offer, setOffer] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [pairingUrl, setPairingUrl] = useState('')
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [config, setConfig] = useAtom(viewerConfigAtom)
  const setStatusAtom = useSetAtom(sessionStatusAtom)
  const appendEvent = useSetAtom(eventLogAtom)

  const {
    data: initialConfig,
  } = useQuery({
    queryKey: ['default-config'],
    queryFn: async () => defaultConfig,
    staleTime: Infinity,
    initialData: defaultConfig,
  })

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
    }
  }, [initialConfig, setConfig])

  const { createOffer, applyAnswer, send, status, lastError, reset } = useWebRTCSession(
    'remote',
    {
      onMessage: handleMessage,
      onStatusChange: (state) => {
        setStatusAtom(state)
        if (state === 'connected') {
          appendEvent((log) => [
            `[${new Date().toLocaleTimeString()}] Viewer connected`,
            ...log,
          ])
        }
      },
    },
  )

  const safeSend = useCallback(
    (message: Message) => {
      try {
        send(message)
      } catch {
        /* channel not ready */
      }
    },
    [send],
  )

  useEffect(() => {
    if (status === 'connected') {
      safeSend({ type: 'viewer:event', event: 'Viewer ready' })
      setStatusNote('Connected')
    }
  }, [safeSend, status])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const pollAnswer = async () => {
      try {
        const response = await fetch(`/api/signal?sessionId=${sessionId}`)
        const data = (await response.json()) as { answer?: string | null }
        if (data?.answer) {
          setStatusNote('Answer received, finalizing...')
          await handleApplyAnswer(data.answer)
          if (timer) clearInterval(timer)
        } else if (!statusNote) {
          setStatusNote('Waiting for remote to connect...')
        }
      } catch {
        /* ignore transient errors */
      }
    }

    pollAnswer()
    timer = setInterval(() => {
      if (!cancelled) void pollAnswer()
    }, 1500)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  function handleMessage(message: Message) {
    if (message.type === 'config:replace') {
      setConfig(message.full)
      safeSend({
        type: 'viewer:event',
        event: 'Config replaced',
      })
      return
    }
    if (message.type === 'config:update') {
      setConfig((prev) => ({ ...prev, ...message.delta }))
      safeSend({
        type: 'viewer:event',
        event: 'Config updated',
      })
      return
    }
  }

  async function generateOffer() {
    setIsGenerating(true)
    const output = await createOffer()
    if (output) {
      const nextSession = generateSessionId()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      setSessionId(nextSession)
      const link = `${origin}/remote?s=${nextSession}&o=${encodeURIComponent(output)}`
      setPairingUrl(link)
      setOffer(output)
      setStatusNote('Waiting for remote to scan...')
      try {
        await fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: nextSession, offer: output }),
        })
      } catch {
        /* network might fail; UI note will cover */
      }
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Offer created`,
        ...log,
      ])
    }
    setIsGenerating(false)
  }

  async function handleApplyAnswer(nextAnswer?: string) {
    const payload = (nextAnswer ?? answer).trim()
    if (!payload) return
    setAnswer(payload)
    try {
      await applyAnswer(payload)
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Answer applied`,
        ...log,
      ])
      setStatusNote('Connected or connecting...')
    } catch (error) {
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Error applying answer: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ...log,
      ])
    }
  }

  const connectionLabel = useMemo(() => {
    switch (status) {
      case 'connected':
        return { text: 'Connected', tone: 'success' as const }
      case 'connecting':
        return { text: 'Linking', tone: 'warning' as const }
      case 'error':
        return { text: 'Error', tone: 'muted' as const }
      default:
        return { text: 'Awaiting offer', tone: 'muted' as const }
    }
  }, [status])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Viewer
          </p>
          <h1 className="text-3xl font-bold text-white">Large screen display</h1>
          <p className="text-sm text-slate-300">
            Create an offer for the remote to scan, then we auto-complete the
            handshake and mirror config deltas instantly.
          </p>
        </div>
        <Badge tone={connectionLabel.tone}>{connectionLabel.text}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {status !== 'connected' ? (
          <Card title="Pair remote" subtitle="Generate a QR the remote can scan.">
            <div className="space-y-3">
              {!offer ? (
                <div className="flex gap-2">
                  <Button
                    onClick={generateOffer}
                    size="sm"
                    variant="primary"
                    disabled={isGenerating}
                  >
                    {isGenerating ? ( <RefreshCcw className="h-4 w-4 animate-spin" />): (<Upload className="h-4 w-4"  />)}
                    {isGenerating ? 'Generating...' : 'Generate QR code'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      reset()
                      setOffer('')
                      setSessionId('')
                      setPairingUrl('')
                      setStatusNote(null)
                      setAnswer('')
                      setConfig(defaultConfig)
                      setIsGenerating(false)
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 md:grid-cols-[220px,1fr]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="rounded-lg bg-slate-900 p-3 max-w-lg">
                      <QRCode
                        value={offer}
                        size={512}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 512 512`}
                        bgColor="#0f172a"
                        fgColor="#e2e8f0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Remote: scan this
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setOffer('')
                          void generateOffer()
                        }}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-300 overflow-x-hidden">
                    <div>
                      Remote can scan the QR above. If scanning fails, use the
                      manual link/code below.
                    </div>
                    {pairingUrl ? (
                      <div className="rounded border border-white/10 bg-black/20 p-2 text-xs font-mono text-slate-200 max-w-full overflow-auto h-48 break-words">
                        {pairingUrl}
                      </div>
                    ) : null}
                      <Textarea
                        className='max-w-full break-words'
                        value={offer}
                        readOnly
                        rows={3}
                        placeholder="Offer code"
                      />
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Remote answer (auto-applied)
                      </label>
                        <Textarea
                          className='max-w-full break-words'
                        value={answer}
                        readOnly
                        rows={4}
                        placeholder="Waiting for remote..."
                      />
                      {statusNote ? (
                        <div className="text-xs text-slate-300">{statusNote}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
              
              {lastError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {lastError}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card
          title="Viewer state"
          subtitle="Applies config:replace then merges config:update deltas."
        >
          <ConfigPreview config={config} />
        </Card>
      </div>
    </div>
  )
}

function ConfigPreview({ config }: { config: ConfigState }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Brightness" value={`${config.brightness}%`} />
        <Stat label="Contrast" value={`${config.contrast}%`} />
        <Stat label="Overlay" value={config.overlay} />
        <Stat label="Label" value={config.label || '—'} />
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200">
        {config.annotations || 'No annotations yet'}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-sm text-purple-100">
        <Eye className="h-4 w-4" />
        Live updates stream via a WebRTC DataChannel. Refresh-proof because the
        remote resends config on reconnect.
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="text-base font-semibold text-white">{value}</div>
    </div>
  )
}

function generateSessionId() {
  return Math.random().toString(36).slice(2, 10)
}
