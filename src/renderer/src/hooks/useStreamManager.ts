import { useEffect, useRef } from 'react'
import { useChatStore } from '../store'

type TokenCb = (token: string) => void
type DoneCb  = (content: string) => void

// Module-level listener sets shared across all hook instances
const tokenListeners = new Set<TokenCb>()
const doneListeners  = new Set<DoneCb>()

// IPC cleanup references — reset each time we (re)initialize
let ipcCleanup: (() => void) | null = null

/**
 * FIX #1: `initialized` flag removed. Instead we track whether the IPC
 * subscriptions are active via `ipcCleanup`. This allows the hook to
 * re-attach IPC listeners after hot-reloads or component re-mounts.
 *
 * FIX #6: The init() polling loop now accepts an AbortSignal so it
 * cancels itself if the component unmounts during the polling window.
 */
function attachIpcListeners(): void {
  // Tear down any previous listeners before re-attaching
  ipcCleanup?.()
  ipcCleanup = null

  const zeta = (window as any).zeta
  if (!zeta?.agent?.onStreamToken) return // not ready yet

  console.log('[StreamManager] ✅ IPC listeners attached')

  const removeToken = zeta.agent.onStreamToken((token: string) => {
    const s = useChatStore.getState()
    const last = s.getActiveMessages().slice(-1)[0]
    if (last?.role === 'assistant' && s.activeConversationId) {
      s.appendStreamToken(s.activeConversationId, last.id, token)
    }
    tokenListeners.forEach(cb => { try { cb(token) } catch {} })
  })

  const removeDone = zeta.agent.onStreamComplete(() => {
    const s = useChatStore.getState()
    s.setIsStreaming(false)
    const last = s.getActiveMessages().slice(-1)[0]
    if (last?.role === 'assistant' && s.activeConversationId) {
      s.updateMessage(s.activeConversationId, last.id, { isStreaming: false })
    }
    const content = last?.content || ''
    console.log('[StreamManager] Done, chars:', content.length)
    doneListeners.forEach(cb => { try { cb(content) } catch {} })
  })

  ipcCleanup = () => {
    try { removeToken?.() } catch {}
    try { removeDone?.() } catch {}
    ipcCleanup = null
    console.log('[StreamManager] IPC listeners removed')
  }
}

function init(signal: AbortSignal): void {
  if (signal.aborted) return
  const zeta = (window as any).zeta
  if (!zeta?.agent?.onStreamToken) {
    setTimeout(() => init(signal), 150)
    return
  }
  if (!signal.aborted) attachIpcListeners()
}

export function useStreamManager(onToken?: TokenCb, onDone?: DoneCb) {
  const tokenRef = useRef(onToken)
  const doneRef  = useRef(onDone)
  tokenRef.current = onToken
  doneRef.current  = onDone

  useEffect(() => {
    // FIX #6: AbortController cancels the polling loop on unmount
    const controller = new AbortController()

    // Re-attach IPC listeners on every mount (fixes hot-reload gap)
    init(controller.signal)

    const tok: TokenCb = (t) => tokenRef.current?.(t)
    const don: DoneCb  = (c) => doneRef.current?.(c)
    if (onToken) tokenListeners.add(tok)
    if (onDone)  doneListeners.add(don)

    return () => {
      controller.abort()
      tokenListeners.delete(tok)
      doneListeners.delete(don)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Expose for manual re-attach after vault key changes etc. */
export function reattachStreamListeners(): void {
  attachIpcListeners()
}
