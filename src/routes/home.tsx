import { Link } from '@tanstack/react-router'
import { ArrowRight, Binary, Eye, PlugZap, Satellite, ScanQrCode, Settings2 } from 'lucide-react'
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
            
          </div>
           <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link to="/remote" className="w-full inline-flex items-center justify-center gap-2">
                  Open Remote
                  <Settings2 className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link to="/viewer" className="w-full inline-flex items-center justify-center gap-2">
                  Open Viewer
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Card
          title="Step 1 • On the viewer"
          subtitle="Generate the QR on the big screen"
        >
          <p className="text-sm text-slate-300">
            Open the Viewer on the large display and click “Generate QR Code.” A QR/link appears containing the offer.
          </p>
        </Card>
        <Card
          title="Step 2 • On the phone/tablet"
          subtitle="Scan and let it auto-connect"
        >
          <p className="text-sm text-slate-300">
            Point the remote at the QR. It fetches the offer, builds an answer, and sends it back.
          </p>
        </Card>
        <Card
          title="Step 3 • Control live"
          subtitle="Tweak settings and watch the viewer react"
        >
          <p className="text-sm text-slate-300">
            Adjust brightness, contrast, overlay, or accent color. Changes stream instantly to the viewer once connected.
          </p>
        </Card>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <Card
          title="Troubleshooting"
          subtitle="If you get stuck"
        >
          <p className="text-sm text-slate-300">
            Regenerate the QR on the viewer and rescan. After clearing cache, scanning will auto-update the remote to the viewer’s version.
          </p>
        </Card>

          <div className="grid sm:grid-cols-2 grid-cols-1 gap-3 text-sm">
            <FeaturePill icon={<PlugZap />} label="P2P WebRTC" />
            <FeaturePill icon={<Binary />} label="Typed config deltas" />
            <FeaturePill icon={<Satellite />} label="API-assisted SDP swap" />
            <FeaturePill icon={<ScanQrCode />} label="Connect with QR" />
          </div>
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
