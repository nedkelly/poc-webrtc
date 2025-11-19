import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message, Role, SessionStatus } from '../shared/protocol'
import type { WebRTCHandlers } from '../shared/webrtc'
import { WebRTCSession } from '../shared/webrtc'

type Options = WebRTCHandlers & { onError?: (message: string) => void }

export function useWebRTCSession(role: Role, options: Options = {}) {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const sessionRef = useRef<WebRTCSession | null>(null)
  const handlersRef = useRef(options)

  useEffect(() => {
    handlersRef.current = options
  }, [options])

  const buildSession = useCallback(() => {
    sessionRef.current?.close()
    const next = new WebRTCSession(role, {
      onMessage: (message: Message) => handlersRef.current.onMessage?.(message),
      onStatusChange: (state: SessionStatus) => setStatus(state),
    })
    sessionRef.current = next
    setStatus(next.getStatus())
    setLastError(null)
    return next
  }, [role])

  useEffect(() => {
    const session = buildSession()
    return () => session.close()
  }, [buildSession])

  const createOffer = useCallback(async () => {
    try {
      return await sessionRef.current?.createOffer()
    } catch (error) {
      const message = (error as Error).message
      handlersRef.current.onError?.(message)
      setLastError(message)
      return null
    }
  }, [])

  const acceptOffer = useCallback(async (offer: string) => {
    try {
      return await sessionRef.current?.acceptOffer(offer)
    } catch (error) {
      const message = (error as Error).message
      handlersRef.current.onError?.(message)
      setLastError(message)
      return null
    }
  }, [])

  const applyAnswer = useCallback(async (answer: string) => {
    try {
      await sessionRef.current?.applyAnswer(answer)
      return true
    } catch (error) {
      const message = (error as Error).message
      handlersRef.current.onError?.(message)
      setLastError(message)
      return false
    }
  }, [])

  const send = useCallback((message: Message) => {
    sessionRef.current?.send(message)
  }, [])

  const reset = useCallback(() => {
    buildSession()
  }, [buildSession])

  const close = useCallback(() => {
    sessionRef.current?.close()
  }, [])

  return {
    status,
    lastError,
    createOffer,
    acceptOffer,
    applyAnswer,
    send,
    reset,
    close,
  }
}
