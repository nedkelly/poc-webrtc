import { useAtom, useSetAtom } from 'jotai'
import { Copy, RefreshCcw, Send, Wifi, ScanLine } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { useWebRTCSession } from '../hooks/useWebRTCSession'
import type { ConfigState, Message } from '../shared/protocol'
import { defaultConfig } from '../shared/protocol'
import {
  eventLogAtom,
  remoteConfigAtom,
  sessionStatusAtom,
} from '../state/config'

export default function Remote() {
  const [config, setConfig] = useAtom(remoteConfigAtom)
  const setStatusAtom = useSetAtom(sessionStatusAtom)
  const [offer, setOffer] = useState('')
  const [answer, setAnswer] = useState('')
  const [copied, setCopied] = useState(false)
  const [answerMode, setAnswerMode] = useState<'manual' | 'scan'>('manual')
  const appendEvent = useSetAtom(eventLogAtom)

  const {
    createOffer,
    applyAnswer,
    send,
    status,
    lastError,
    reset,
  } = useWebRTCSession('remote', {
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
    if (status === 'connected') {
      safeSend({ type: 'config:replace', full: config })
    }
  }, [config, safeSend, status])

  useEffect(() => {
    if (status === 'connected') {
      safeSend({ type: 'config:update', delta: config })
    }
  }, [config, safeSend, status])

  function handleMessage(message: Message) {
    if (message.type === 'viewer:event') {
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Viewer: ${message.event}`,
        ...log,
      ])
    }
  }

  async function handleOffer() {
    const result = await createOffer()
    if (result) {
      setOffer(result)
    }
  }

  async function handleApplyAnswer() {
    const ok = await applyAnswer(answer.trim())
    if (ok) {
      appendEvent((log) => [
        `[${new Date().toLocaleTimeString()}] Applied answer`,
        ...log,
      ])
    }
  }

  async function copyOffer() {
    if (!offer) return
    await navigator.clipboard.writeText(offer)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const connectionLabel = useMemo(() => {
    switch (status) {
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
  }, [status])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Remote Controller
          </p>
          <h1 className="text-3xl font-bold text-white">Authoritative remote</h1>
          <p className="text-sm text-slate-300">
            Create the offer, share it with the viewer, and push config deltas
            as you tweak controls.
          </p>
        </div>
        <Badge tone={connectionLabel.tone}>
          {connectionLabel.text}
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="1) Pairing"
          subtitle="Generate an offer, share it, then apply the viewer answer."
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleOffer} size="sm">
                <Wifi className="h-4 w-4" />
                Create offer
              </Button>
              <Button variant="outline" size="sm" onClick={copyOffer} disabled={!offer}>
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy offer'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset()
                  setOffer('')
                  setAnswer('')
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
            <Textarea
              value={offer}
              rows={5}
              placeholder="Offer blob will appear here once generated"
              readOnly
            />
            {offer ? (
              <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 md:grid-cols-[200px,1fr]">
                <div className="flex flex-col items-center justify-center gap-2">
                  <QRCodeCanvas
                    value={offer}
                    size={180}
                    bgColor="#0f172a"
                    fgColor="#e2e8f0"
                    level="M"
                  />
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    Scan to send offer
                  </div>
                </div>
                <div className="text-xs text-slate-300">
                  Show this QR to the viewer device. If camera access fails,
                  keep copy/paste as fallback.
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Viewer answer
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={answerMode === 'manual' ? 'primary' : 'ghost'}
                  onClick={() => setAnswerMode('manual')}
                >
                  Manual
                </Button>
                <Button
                  size="sm"
                  variant={answerMode === 'scan' ? 'primary' : 'ghost'}
                  onClick={() => setAnswerMode('scan')}
                >
                  <ScanLine className="h-4 w-4" />
                  Scan QR
                </Button>
              </div>
              {answerMode === 'manual' ? (
                <Textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={4}
                  placeholder="Paste the viewer's answer blob"
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <Scanner
                    onScan={(codes) => {
                      const code = codes[0]?.rawValue
                      if (code) setAnswer(code)
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
                    Point your camera at the viewer&apos;s answer QR. You can
                    switch back to manual at any time.
                  </div>
                </div>
              )}
              <Button
                onClick={handleApplyAnswer}
                variant="primary"
                size="sm"
                disabled={!answer}
              >
                <Send className="h-4 w-4" />
                Apply answer
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
          title="2) Config controls"
          subtitle="Remote state is authoritative; every change sends a delta."
        >
          <ConfigForm
            config={config}
            onChange={(delta) => setConfig((prev) => ({ ...prev, ...delta }))}
            disabled={status !== 'connected'}
          />
        </Card>
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
    <ul className="space-y-2 text-sm text-slate-100">
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
