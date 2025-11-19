import { atom } from 'jotai'
import type { ConfigState, SessionStatus } from '../shared/protocol'
import { defaultConfig } from '../shared/protocol'

export const remoteConfigAtom = atom<ConfigState>(defaultConfig)
export const viewerConfigAtom = atom<ConfigState>(defaultConfig)
export const sessionStatusAtom = atom<SessionStatus>('idle')
export const eventLogAtom = atom<string[]>([])
