import { useAtom, useSetAtom } from 'jotai'
import { Copy, Eye, RefreshCcw, Upload, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import { Scanner } from '@yudiel/react-qr-scanner'
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
  const [answer, setAnswer] = useState('')
  const [copied, setCopied] = useState(false)
  const [config, setConfig] = useAtom(viewerConfigAtom)
  const [offerMode, setOfferMode] = useState<'manual' | 'scan'>('manual')
  const setStatusAtom = useSetAtom(sessionStatusAtom)
  const appendEvent = useSetAtom(eventLogAtom)

  const { data: initialConfig } = useQuery({
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

  const { acceptOffer, send, status, lastError, reset } = useWebRTCSession(
    'viewer',
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
    }
  }, [safeSend, status])

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

  async function generateAnswer() {
    const output = await acceptOffer(offer.trim())
    if (output) {
      setAnswer(output)
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Answer created`,
        ...log,
      ])
    }
  }

  async function copyAnswer() {
    if (!answer) return
    await navigator.clipboard.writeText(answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
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
            Paste the remote&apos;s offer, emit an answer, and mirror any config
            deltas instantly.
          </p>
        </div>
        <Badge tone={connectionLabel.tone}>{connectionLabel.text}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Handshake" subtitle="Viewer responds to the remote offer">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Remote offer
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={offerMode === 'manual' ? 'primary' : 'ghost'}
                onClick={() => setOfferMode('manual')}
              >
                Manual
              </Button>
              <Button
                size="sm"
                variant={offerMode === 'scan' ? 'primary' : 'ghost'}
                onClick={() => setOfferMode('scan')}
              >
                <ScanLine className="h-4 w-4" />
                Scan QR
              </Button>
            </div>
            {offerMode === 'manual' ? (
              <Textarea
                value={offer}
                onChange={(event) => setOffer(event.target.value)}
                rows={4}
                placeholder="Paste offer blob from the remote controller"
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <Scanner
                  onScan={(codes) => {
                    const code = codes[0]?.rawValue
                    if (code) setOffer(code)
                  }}
                  onError={(error: unknown) =>
                    console.error(error instanceof Error ? error.message : error)
                  }
                  constraints={{ facingMode: 'environment' }}
                  styles={{
                    container: {
                      width: '100%',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    },
                    video: { width: '100%' },
                  }}
                />
                <div className="mt-2 text-xs text-slate-400">
                  Scan the remote&apos;s QR offer or switch back to manual paste.
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={generateAnswer}
                size="sm"
                disabled={!offer.trim()}
              >
                <Upload className="h-4 w-4" />
                Create answer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset()
                  setOffer('')
                  setAnswer('')
                  setConfig(defaultConfig)
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Answer to send back
              </label>
              <Textarea value={answer} readOnly rows={4} />
              {answer ? (
                <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 md:grid-cols-[200px,1fr]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <QRCodeCanvas
                      value={answer}
                      size={180}
                      bgColor="#0f172a"
                      fgColor="#e2e8f0"
                      level="M"
                    />
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Scan to send answer
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    Show this QR to the remote. The manual text above continues
                    to work as a fallback.
                  </div>
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAnswer}
                disabled={!answer}
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy answer'}
              </Button>
            </div>
            {lastError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {lastError}
              </div>
            ) : null}
          </div>
        </Card>

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
