import { Link } from '@tanstack/react-router'
import { ArrowRight, Binary, PlugZap, Satellite } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-900/70 p-8 shadow-2xl shadow-purple-500/15">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Badge>Multi-Device Configurator PoC</Badge>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Zero-server WebRTC remote control
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              A paired Viewer/Remote that trades SDP blobs over copy/paste.
              Everything runs client-side over WebRTC DataChannels with
              authoritative remote config deltas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/remote" className="inline-flex items-center gap-2">
                  Open Remote
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/viewer">Open Viewer</Link>
              </Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <FeaturePill icon={<PlugZap />} label="P2P WebRTC" />
            <FeaturePill icon={<Binary />} label="Typed config deltas" />
            <FeaturePill icon={<Satellite />} label="API-assisted SDP swap" />
            <FeaturePill icon={<ArrowRight />} label="Tailwind v4 + Vite" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Card
          title="1) Viewer creates offer"
          subtitle="Generates session + offer; QR carries both."
        >
          <p className="text-sm text-slate-300">
            Tap "Create offer" on the Viewer. The QR/link encodes a session ID
            plus the offer and also posts it to `/api/signal` for the remote to
            pick up.
          </p>
        </Card>
        <Card
          title="2) Remote answers"
          subtitle="Auto-fetches offer and posts answer."
        >
          <p className="text-sm text-slate-300">
            Remote scans the QR or opens the link, retrieves the offer from the
            QR/API, generates the answer, and POSTs it back to
            `/api/signal`.
          </p>
        </Card>
        <Card
          title="3) Config syncs live"
          subtitle="Remote is authoritative; viewer subscribes."
        >
          <p className="text-sm text-slate-300">
            The Remote pushes `config:update` deltas and periodic heartbeats.
            The Viewer patches state instantly with no polling.
          </p>
        </Card>
      </section>      
    </div>
  )
}

function FeaturePill({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
      <span className="text-slate-300">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
        {label}
      </span>
    </div>
  )
}
