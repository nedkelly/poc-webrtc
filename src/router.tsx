/* eslint-disable react-refresh/only-export-components */
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import Home from './routes/home'
import Remote from './routes/remote'
import Viewer from './routes/viewer'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const viewerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/viewer',
  component: Viewer,
})

const remoteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/remote',
  component: Remote,
})

const routeTree = rootRoute.addChildren([homeRoute, viewerRoute, remoteRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute -left-10 -top-10 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute bottom-10 right-2 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/70 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-lg font-semibold"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-base font-bold text-slate-950 shadow-lg shadow-purple-500/20 transition group-hover:scale-105">
              P2P
            </span>
            <div className="leading-tight">
              <div className="text-sm uppercase tracking-[0.18em] text-slate-400">
                WebRTC
              </div>
              <div>Configurator</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <NavLink to="/viewer" label="Viewer" />
            <NavLink to="/remote" label="Remote" />
          
          </div>
        </nav>
      </header>
      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/5 hover:text-white"
      activeProps={{
        className:
          'bg-white/10 text-white shadow-md shadow-purple-500/10 border border-white/10',
      }}
    >
      {label}
    </Link>
  )
}
