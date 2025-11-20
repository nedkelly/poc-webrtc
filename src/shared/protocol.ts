export type ConfigState = {
  brightness: number
  contrast: number
  overlay: 'grid' | 'crosshair' | 'none'
  color: 'cyan' | 'purple' | 'amber' | 'lime' | 'red'
  label: string
  annotations: string
}

export const defaultConfig: ConfigState = {
  brightness: 60,
  contrast: 40,
  overlay: 'grid',
  color: 'cyan',
  label: 'Remote Control',
  annotations: 'Double-check camera framing before going live.',
}

export type Message =
  | { type: 'config:update'; delta: Partial<ConfigState> }
  | { type: 'config:replace'; full: ConfigState }
  | { type: 'viewer:event'; event: string }
  | { type: 'system:ping' }
  | { type: 'system:pong' }

export type Role = 'viewer' | 'remote'

export type SessionStatus =
  | 'idle'
  | 'building-offer'
  | 'awaiting-answer'
  | 'connecting'
  | 'connected'
  | 'closed'
  | 'error'
