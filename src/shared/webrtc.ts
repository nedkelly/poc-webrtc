import { deflateRaw, inflateRaw } from 'pako'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Message, Role, SessionStatus } from './protocol'

type SignalBundle = {
  description: RTCSessionDescriptionInit
  candidates: RTCIceCandidateInit[]
}

export type WebRTCHandlers = {
  onMessage?: (message: Message) => void
  onStatusChange?: (status: SessionStatus) => void
}

export class WebRTCSession {
  private pc: RTCPeerConnection
  private channel?: RTCDataChannel
  private heartbeat?: ReturnType<typeof setInterval>
  private status: SessionStatus = 'idle'
  private handlers: WebRTCHandlers

  constructor(role: Role, handlers: WebRTCHandlers = {}) {
    this.handlers = handlers
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    if (role === 'remote') {
      this.attachChannel(this.pc.createDataChannel('configurator'))
    } else {
      this.pc.ondatachannel = (event) => this.attachChannel(event.channel)
    }

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      if (state === 'connected') {
        this.updateStatus('connected')
      }
      if (state === 'disconnected') {
        // transient; treat as reconnecting rather than hard error
        this.updateStatus('connecting')
        this.stopHeartbeat()
      }
      if (state === 'failed') {
        this.updateStatus('error')
        this.stopHeartbeat()
      }
      if (state === 'closed') {
        this.updateStatus('closed')
        this.stopHeartbeat()
      }
    }
  }

  async createOffer() {
    this.updateStatus('building-offer')
    const offer = await this.pc.createOffer({ iceRestart: true })
    await this.pc.setLocalDescription(offer)
    const bundle = await this.gatherIce(offer)
    this.updateStatus('awaiting-answer')
    return serializeSignal(bundle)
  }

  async acceptOffer(serializedOffer: string) {
    const bundle = parseSignal(serializedOffer)
    await this.pc.setRemoteDescription(bundle.description)
    await Promise.all(
      bundle.candidates.map((candidate) => this.pc.addIceCandidate(candidate)),
    )
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    const answerBundle = await this.gatherIce(answer)
    this.updateStatus('connecting')
    return serializeSignal(answerBundle)
  }

  async applyAnswer(serializedAnswer: string) {
    const bundle = parseSignal(serializedAnswer)
    await this.pc.setRemoteDescription(bundle.description)
    await Promise.all(
      bundle.candidates.map((candidate) => this.pc.addIceCandidate(candidate)),
    )
    this.updateStatus('connecting')
  }

  send(message: Message) {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('DataChannel not ready')
    }
    this.channel.send(JSON.stringify(message))
  }

  close() {
    this.stopHeartbeat()
    this.channel?.close()
    this.pc.close()
    this.updateStatus('closed')
  }

  getStatus() {
    return this.status
  }

  private attachChannel(channel: RTCDataChannel) {
    this.channel = channel
    channel.onopen = () => {
      this.updateStatus('connected')
      this.startHeartbeat()
    }
    channel.onclose = () => {
      this.stopHeartbeat()
      this.updateStatus('closed')
    }
    channel.onerror = () => {
      this.stopHeartbeat()
      this.updateStatus('error')
    }
    channel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as Message
        if (parsed.type === 'system:ping') {
          this.channel?.send(JSON.stringify({ type: 'system:pong' }))
          return
        }
        this.handlers.onMessage?.(parsed)
      } catch (error) {
        console.error('Failed to parse incoming message', error)
      }
    }
  }

  private async gatherIce(description: RTCSessionDescriptionInit) {
    const candidates: RTCIceCandidateInit[] = []
    await Promise.race([
      new Promise<void>((resolve) => {
        this.pc.onicecandidate = (event) => {
          if (event.candidate) {
            candidates.push(event.candidate.toJSON())
          } else {
            resolve()
          }
        }
      }),
      // Cap ICE gathering to avoid long waits on slow networks
      new Promise<void>((resolve) => setTimeout(resolve, 3500)),
    ])
    return { description: this.pc.localDescription ?? description, candidates }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeat = setInterval(() => {
      if (this.channel?.readyState === 'open') {
        this.channel.send(JSON.stringify({ type: 'system:ping' }))
      }
    }, 8000)
  }

  private stopHeartbeat() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat)
      this.heartbeat = undefined
    }
  }

  private updateStatus(next: SessionStatus) {
    if (this.status !== next) {
      this.status = next
      this.handlers.onStatusChange?.(next)
    }
  }
}

function serializeSignal(bundle: SignalBundle) {
  const json = JSON.stringify(bundle)
  try {
    // deflate + base64url is generally smaller than lz-string for SDP blobs
    const compressed = deflateRaw(json)
    return `d:${bytesToBase64Url(compressed)}`
  } catch {
    // Fallback to lz-string if deflate fails
    return `l:${compressToEncodedURIComponent(json)}`
  }
}

function parseSignal(serialized: string): SignalBundle {
  // Try deflate-based payloads: prefixed with "d:"
  if (serialized.startsWith('d:')) {
    const payload = serialized.slice(2)
    try {
      const inflated = inflateRaw(base64UrlToBytes(payload), { to: 'string' })
      return JSON.parse(inflated as string)
    } catch {
      /* fall through */
    }
  }

  // Try lz-string payloads: prefixed with "l:" or raw legacy
  const lzPayload = serialized.startsWith('l:')
    ? serialized.slice(2)
    : serialized
  const decompressed = decompressFromEncodedURIComponent(lzPayload)
  if (decompressed) {
    return JSON.parse(decompressed)
  }
  return JSON.parse(atob(serialized))
}

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(encoded: string) {
  const padded = encoded.padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), '=')
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
