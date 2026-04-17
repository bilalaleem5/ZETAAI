/**
 * useStreamManager — Singleton IPC stream listener
 * Registers agent:stream-token and agent:stream-complete ONCE.
 * Polls for window.zeta readiness before attaching.
 * All hooks share these listeners — zero duplicates.
 */
import { useEffect, useRef } from 'react'
import { useChatStore } from '../store'

type TokenCb = (token: string) => void
type DoneCb  = (content: string) => void

const tokenCbs = new Set<TokenCb>()
const doneCbs  = new Set<DoneCb>()
let cleanup: (() => void) | null = null

function attach() {
  cleanup?.()
  cleanup = null
  const z = (window as any).zeta
  if (!z?.agent?.onStreamToken) return

  console.log('[Stream] ✅ IPC listeners attached')

  const offToken = z.agent.onStreamToken((token: string) => {
    const s = useChatStore.getState()
    const last = s.getActiveMessages().slice(-1)[0]
    if (last?.role === 'assistant' && s.activeConversationId) {
      s.appendStreamToken(s.activeConversationId, last.id, token)
    }
    tokenCbs.forEach(cb => { try { cb(token) } catch {} })
  })

  const offDone = z.agent.onStreamComplete(() => {
    const s = useChatStore.getState()
    s.setIsStreaming(false)
    const last = s.getActiveMessages().slice(-1)[0]
    if (last?.role === 'assistant' && s.activeConversationId) {
      s.updateMessage(s.activeConversationId, last.id, { isStreaming: false })
    }
    const content = last?.content || ''
    console.log('[Stream] Done, chars:', content.length)
    doneCbs.forEach(cb => { try { cb(content) } catch {} })
  })

  cleanup = () => { try { offToken?.() } catch {}; try { offDone?.() } catch {}; cleanup = null }
}

function init(signal: AbortSignal) {
  if (signal.aborted) return
  if ((window as any).zeta?.agent?.onStreamToken) { attach(); return }
  setTimeout(() => init(signal), 150)
}

export function useStreamManager(onToken?: TokenCb, onDone?: DoneCb) {
  const tokRef  = useRef(onToken)
  const doneRef = useRef(onDone)
  tokRef.current  = onToken
  doneRef.current = onDone

  useEffect(() => {
    const ctrl = new AbortController()
    init(ctrl.signal)

    const tok: TokenCb = t => tokRef.current?.(t)
    const don: DoneCb  = c => doneRef.current?.(c)
    if (onToken) tokenCbs.add(tok)
    if (onDone)  doneCbs.add(don)

    return () => {
      ctrl.abort()
      tokenCbs.delete(tok)
      doneCbs.delete(don)
    }
  }, []) // eslint-disable-line
}
