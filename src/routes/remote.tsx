import { useAtom, useSetAtom } from 'jotai'
import { RefreshCcw, ScanLine } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { useWebRTCSession } from '../hooks/useWebRTCSession'
import type { ConfigState, Message } from '../shared/protocol'
import { defaultConfig } from '../shared/protocol'
import { APP_VERSION } from '../shared/buildInfo'
import {
  eventLogAtom,
  remoteConfigAtom,
  sessionStatusAtom,
} from '../state/config'

export default function Remote() {
  const [config, setConfig] = useAtom(remoteConfigAtom)
  const setStatusAtom = useSetAtom(sessionStatusAtom)
  const [sessionId, setSessionId] = useState('')
  const [inlineOffer, setInlineOffer] = useState<string | null>(null)
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasPostedAnswer, setHasPostedAnswer] = useState(false)
  const [connectedOnce, setConnectedOnce] = useState(false)
  const appendEvent = useSetAtom(eventLogAtom)

  const {
    acceptOffer,
    send,
    status,
    lastError,
    reset,
  } = useWebRTCSession('viewer', {
    onMessage: handleMessage,
    onStatusChange: (state) => {
      setStatusAtom(state)
      if (state === 'connected') {
        appendEvent((log) => [
          `[${new Date().toLocaleTimeString()}] Connected to viewer`,
          ...log,
        ])
      }
    },
    onError: (message) => {
      console.error(message)
    },
  })

  const effectiveStatus = connectedOnce ? 'connected' : status

  useEffect(() => {
    if (lastError) {
      setScanNote(lastError)
    }
  }, [lastError])

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    )
    const fromUrl = params.get('s')
    const offerParam = params.get('o')
    if (fromUrl) {
      setSessionId(fromUrl)
      if (offerParam) {
        setInlineOffer(decodeURIComponent(offerParam))
      }
      setScanNote('Session detected from URL, fetching offer...')
    }
  }, [])

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

  const safeSend = useCallback(
    (message: Message) => {
      try {
        send(message)
      } catch (error) {
        console.error(error)
      }
    },
    [send],
  )

  useEffect(() => {
    if (effectiveStatus === 'connected') {
      safeSend({ type: 'config:replace', full: config })
      setScanNote('Connected')
      setHasPostedAnswer(true)
      setConnectedOnce(true)
      setSessionId('')
    }
  }, [config, effectiveStatus, safeSend])

  useEffect(() => {
    if (effectiveStatus === 'connected') {
      safeSend({ type: 'config:update', delta: config })
    }
  }, [config, effectiveStatus, safeSend])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const timer = setInterval(() => {
      if (!cancelled) void fetchAndAnswer(sessionId)
    }, 1500)
    void fetchAndAnswer(sessionId)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId])

  function handleMessage(message: Message) {
    if (message.type === 'viewer:event') {
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Viewer: ${message.event}`,
        ...log,
      ])
    }
  }

  async function fetchAndAnswer(targetSession: string) {
    if (
      isProcessing ||
      !targetSession ||
      hasPostedAnswer ||
      status === 'connected' ||
      connectedOnce
    )
      return

    if (status !== 'idle') {
      reset()
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    setIsProcessing(true)
    setScanNote('Fetching offer...')
    try {
      let offer = inlineOffer
      if (!offer) {
        const response = await fetch(`/api/signal?sessionId=${targetSession}`)
        const data = (await response.json()) as { offer?: string | null }
        if (!data?.offer) {
          setScanNote('Waiting for viewer offer...')
          setIsProcessing(false)
          return
        }
        offer = data.offer
      } else {
        setScanNote('Using inline offer from QR, skipping API wait...')
        setInlineOffer(null)
      }

      setScanNote('Processing offer...')
      const answer = await acceptOffer(offer)
      if (!answer) {
        setScanNote('Failed to process offer, retry scanning')
        return
      }

      setScanNote('Sending answer to viewer...')
      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: targetSession, answer }),
      })

    setHasPostedAnswer(true)
    setSessionId('')
    setScanNote('Answer sent. Connecting to viewer...')
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Answer created and sent`,
        ...log,
      ])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to process offer'
      setScanNote(message)
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Error: ${message}`,
        ...log,
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const connectionLabel = useMemo(() => {
    switch (effectiveStatus) {
      case 'connected':
        return { text: 'Connected', tone: 'success' as const }
      case 'awaiting-answer':
      case 'connecting':
        return { text: 'Pairing', tone: 'warning' as const }
      case 'error':
        return { text: 'Error', tone: 'muted' as const }
      default:
        return { text: 'Idle', tone: 'muted' as const }
    }
  }, [effectiveStatus])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Remote Controller
          </p>
          <h1 className="text-3xl font-bold text-white">Authoritative remote</h1>
          <p className="text-sm text-slate-300">
            Point your camera at the viewer’s QR code to connect to the viewer. Once paired, every config tweak
            streams live to the viewer.
          </p>
        </div>
        <Badge tone={connectionLabel.tone}>
          {connectionLabel.text}
        </Badge>
      </div>

      <div>
        {!connectedOnce ? (
            <div className="space-y-1">
              {scanNote ? (
                <div className="text-xs text-slate-300">{scanNote}</div>
              ) : null}

                <Scanner
                  onScan={(codes) => {
                    const code = codes[0]?.rawValue
                    if (code) {
                      const parsed = extractSession(code)
                      if (parsed.version && parsed.version !== APP_VERSION && parsed.url) {
                        setScanNote('Updating app to match viewer version...')
                        window.location.href = parsed.url
                        return
                      }
                      const { session, offer } = parsed
                      setSessionId(session)
                      setHasPostedAnswer(false)
                      setInlineOffer(offer)
                      setScanNote('Code captured, fetching offer...')
                    }
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
              
              {lastError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {lastError}
                </div>
              ) : null}
            </div>
        ) : (
        <Card
          title="2) Config controls"
          subtitle="Remote state is authoritative; every change sends a delta."
        >
          <ConfigForm
            config={config}
            onChange={(delta) => setConfig((prev) => ({ ...prev, ...delta }))}
            disabled={effectiveStatus !== 'connected'}
          />
        </Card>
        )}
      </div>

      <Card title="Activity log" subtitle="Latest heartbeat and viewer events">
        <LogList />
      </Card>
    </div>
  )
}

function ConfigForm({
  config,
  onChange,
  disabled,
}: {
  config: ConfigState
  onChange: (delta: Partial<ConfigState>) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-4">
      <Field label="Brightness" help="0-100%">
        <input
          type="range"
          min={0}
          max={100}
          value={config.brightness}
          onChange={(event) =>
            onChange({ brightness: Number(event.target.value) })
          }
          className="w-full accent-purple-400"
          disabled={disabled}
        />
      </Field>
      <Field label="Contrast" help="0-100%">
        <input
          type="range"
          min={0}
          max={100}
          value={config.contrast}
          onChange={(event) =>
            onChange({ contrast: Number(event.target.value) })
          }
          className="w-full accent-cyan-400"
          disabled={disabled}
        />
      </Field>
      <Field label="Accent color" help="Viewer highlight">
        <div className="flex flex-wrap gap-2">
          {(['cyan', 'purple', 'amber', 'lime', 'red'] as ConfigState['color'][]).map(
            (value) => (
              <Button
                key={value}
                variant={config.color === value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onChange({ color: value })}
                disabled={disabled}
              >
                {value}
              </Button>
            ),
          )}
        </div>
      </Field>
      <Field label="Overlay" help="Viewer decoration">
        <div className="grid grid-cols-3 gap-2">
          {['grid', 'crosshair', 'none'].map((value) => (
            <Button
              key={value}
              variant={config.overlay === value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onChange({ overlay: value as ConfigState['overlay'] })}
              disabled={disabled}
            >
              {value}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Label">
        <Input
          value={config.label}
          onChange={(event) => onChange({ label: event.target.value })}
          placeholder="Session label"
          disabled={disabled}
        />
      </Field>
      <Field label="Annotations">
        <Textarea
          value={config.annotations}
          onChange={(event) => onChange({ annotations: event.target.value })}
          rows={3}
          placeholder="Notes for the viewer"
          disabled={disabled}
        />
      </Field>
      <div className="text-xs text-slate-400">
        Tip: state is initialized to a dummy config (`defaultConfig`) and every
        tweak is published as a `config:update` delta.
      </div>
    </div>
  )
}

function Field({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
        <span>{label}</span>
        {help ? <span className="text-slate-500">{help}</span> : null}
      </div>
      {children}
    </div>
  )
}

function LogList() {
  const [events] = useAtom(eventLogAtom)
  if (!events.length) {
    return (
      <div className="text-sm text-slate-400">
        Waiting for heartbeat and viewer events...
      </div>
    )
  }
  return (
    <ul className="space-y-2 text-xs font-mono text-slate-100">
      {events.map((item, idx) => (
        <li
          key={`${item}-${idx}`}
          className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-slate-200"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function extractSession(raw: string) {
  try {
    const url = new URL(raw)
    return {
      session: url.searchParams.get('s') ?? raw,
      offer: url.searchParams.get('o'),
      version: url.searchParams.get('v'),
      url: url.toString(),
    }
  } catch {
    return { session: raw, offer: null, version: null, url: null }
  }
}
