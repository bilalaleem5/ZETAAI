import { safeStorage } from 'electron'
// electron-store v8 uses require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store')
const store = new Store({ name: 'zeta-vault', encryptionKey: 'zeta-secure-key-v1' })

type VaultAction = 'set' | 'get' | 'delete' | 'list'

interface VaultPayload {
  key?: string
  value?: string
}

const VAULT_PREFIX = 'vault:'

export async function handleSecurityVault(
  action: VaultAction,
  payload: VaultPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'set': {
        if (!payload.key || !payload.value) {
          return { success: false, error: 'Key and value required' }
        }
        let storedValue = payload.value
        // Use Electron's safeStorage if available (encrypts with OS keychain)
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(payload.value)
          storedValue = encrypted.toString('base64')
          store.set(`${VAULT_PREFIX}${payload.key}:encrypted`, true)
        }
        store.set(`${VAULT_PREFIX}${payload.key}`, storedValue)
        // Also set as env var for runtime use
        process.env[payload.key.toUpperCase()] = payload.value
        return { success: true }
      }

      case 'get': {
        if (!payload.key) return { success: false, error: 'Key required' }
        const raw = store.get(`${VAULT_PREFIX}${payload.key}`) as string | undefined
        if (!raw) return { success: true, data: null }

        const isEncrypted = store.get(`${VAULT_PREFIX}${payload.key}:encrypted`) as boolean
        if (isEncrypted && safeStorage.isEncryptionAvailable()) {
          const decrypted = safeStorage.decryptString(Buffer.from(raw, 'base64'))
          return { success: true, data: decrypted }
        }
        return { success: true, data: raw }
      }

      case 'delete': {
        if (!payload.key) return { success: false, error: 'Key required' }
        store.delete(`${VAULT_PREFIX}${payload.key}`)
        store.delete(`${VAULT_PREFIX}${payload.key}:encrypted`)
        return { success: true }
      }

      case 'list': {
        // Return list of stored key names (not values)
        const allKeys = Object.keys(store.store).filter(
          (k) => k.startsWith(VAULT_PREFIX) && !k.endsWith(':encrypted')
        )
        const keyNames = allKeys.map((k) => k.replace(VAULT_PREFIX, ''))
        return { success: true, data: keyNames }
      }

      default:
        return { success: false, error: `Unknown vault action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[SecurityVault:${action}] Error:`, errMsg)
    return { success: false, error: errMsg }
  }
}
