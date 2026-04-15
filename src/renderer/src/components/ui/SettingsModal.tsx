import React, { useState, useEffect } from 'react'
import {
  X, Key, Eye, EyeOff, Save, Trash2, Check,
  FolderOpen, Brain, Loader2, Shield, ChevronDown, ChevronUp
} from 'lucide-react'
import { useSettingsStore } from '../../store'

interface ApiKey {
  key: string
  label: string
  placeholder: string
  hint: string
  link: string
}

const API_KEYS: ApiKey[] = [
  {
    key: 'GEMINI_API_KEY',
    label: 'Google Gemini API Key',
    placeholder: 'AIza...',
    hint: 'Powers Gemini 2.0 Flash — fast and capable',
    link: 'https://aistudio.google.com/app/apikey'
  },
  {
    key: 'GROQ_API_KEY',
    label: 'Groq API Key',
    placeholder: 'gsk_...',
    hint: 'Powers Llama 3.3 70B — ultra-fast inference',
    link: 'https://console.groq.com/keys'
  },
  {
    key: 'TAVILY_API_KEY',
    label: 'Tavily Search API Key',
    placeholder: 'tvly-...',
    hint: 'Optional — enables deep web research in Web Agent',
    link: 'https://app.tavily.com'
  },
  {
    key: 'OPENWEATHER_API_KEY',
    label: 'OpenWeather API Key',
    placeholder: 'abc123...',
    hint: 'Optional — free fallback (wttr.in) works without key',
    link: 'https://openweathermap.org/api'
  },
  {
    key: 'GNEWS_API_KEY',
    label: 'GNews API Key',
    placeholder: 'abc123...',
    hint: 'Optional — free fallback (BBC RSS) works without key',
    link: 'https://gnews.io'
  }
]

export function SettingsModal(): React.ReactElement {
  const { setSettingsOpen, setRagIndexed } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<'vault' | 'rag' | 'about'>('vault')
  const [keyValues, setKeyValues] = useState<Record<string, string>>({})
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({})
  const [savedKeys, setSavedKeys] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // RAG state
  const [ragPath, setRagPath] = useState('')
  const [ragLoading, setRagLoading] = useState(false)
  const [ragResult, setRagResult] = useState<{ files: number; chunks: number } | null>(null)

  useEffect(() => {
    // Load saved key names
    window.zeta.vault.listKeys().then((res) => {
      if (res.success && res.data) {
        setSavedKeys(res.data as string[])
      }
    })
  }, [])

  const handleSaveKey = async (keyName: string) => {
    const val = keyValues[keyName]
    if (!val?.trim()) return
    setSaving(keyName)
    const res = await window.zeta.vault.setKey(keyName, val.trim())
    setSaving(null)
    if (res.success) {
      setSaved(keyName)
      setSavedKeys((prev) => [...new Set([...prev, keyName])])
      setTimeout(() => setSaved(null), 2000)
    }
  }

  const handleDeleteKey = async (keyName: string) => {
    await window.zeta.vault.deleteKey(keyName)
    setSavedKeys((prev) => prev.filter((k) => k !== keyName))
    setKeyValues((prev) => ({ ...prev, [keyName]: '' }))
  }

  const handleIngestRag = async () => {
    if (!ragPath.trim()) return
    setRagLoading(true)
    setRagResult(null)
    try {
      const isFile = ragPath.includes('.')
      const payload = isFile ? { filePath: ragPath } : { dirPath: ragPath }
      const res = await window.zeta.rag.ingest(payload)
      if (res.success && res.data) {
        const d = res.data as { ingested: number; files: number }
        setRagResult({ chunks: d.ingested, files: d.files })
        setRagIndexed(true, d.files)
      }
    } finally {
      setRagLoading(false)
    }
  }

  const handleClearRag = async () => {
    await window.zeta.rag.clear()
    setRagResult(null)
    setRagIndexed(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[#0f0f1a] border border-[rgba(139,92,246,0.25)] rounded-2xl shadow-[0_0_60px_rgba(139,92,246,0.15)] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(139,92,246,0.15)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center">
              <Shield size={13} className="text-[#8b5cf6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e2e8f0]">ZETA Vault</h2>
              <p className="text-[10px] text-[#334155] font-mono">Encrypted local key storage</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg text-[#475569] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.05)] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgba(139,92,246,0.1)]">
          {(['vault', 'rag', 'about'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'text-[#8b5cf6] border-b-2 border-[#8b5cf6] bg-[rgba(139,92,246,0.05)]'
                  : 'text-[#475569] hover:text-[#64748b]'
              }`}
            >
              {tab === 'vault' && '🔑 API Keys'}
              {tab === 'rag' && '🧠 Memory'}
              {tab === 'about' && 'ℹ️ About'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* ── Vault Tab ── */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <p className="text-[11px] text-[#475569] leading-relaxed">
                Keys are encrypted with your OS keychain and never leave your device.
              </p>
              {API_KEYS.map((apiKey) => {
                const isConfigured = savedKeys.includes(apiKey.key)
                const isSaving = saving === apiKey.key
                const isSaved = saved === apiKey.key
                const isVisible = keyVisible[apiKey.key]

                return (
                  <div
                    key={apiKey.key}
                    className="p-4 rounded-xl bg-[#0a0a0f] border border-[rgba(139,92,246,0.1)] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={12} className={isConfigured ? 'text-[#10b981]' : 'text-[#475569]'} />
                        <span className="text-xs font-medium text-[#e2e8f0]">{apiKey.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)] font-mono">
                            SAVED
                          </span>
                        )}
                        <a
                          href={apiKey.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] text-[#475569] hover:text-[#8b5cf6] underline font-mono transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Get key →
                        </a>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#334155]">{apiKey.hint}</p>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={keyValues[apiKey.key] ?? ''}
                          onChange={(e) =>
                            setKeyValues((prev) => ({ ...prev, [apiKey.key]: e.target.value }))
                          }
                          placeholder={isConfigured ? '••••••••••••••••' : apiKey.placeholder}
                          className="w-full bg-[#141420] border border-[rgba(139,92,246,0.15)] focus:border-[rgba(139,92,246,0.4)] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#2d3748] outline-none pr-8 font-mono transition-all"
                        />
                        <button
                          onClick={() =>
                            setKeyVisible((prev) => ({ ...prev, [apiKey.key]: !isVisible }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#334155] hover:text-[#64748b] transition-colors"
                        >
                          {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>

                      <button
                        onClick={() => handleSaveKey(apiKey.key)}
                        disabled={!keyValues[apiKey.key]?.trim() || isSaving}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          isSaved
                            ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)]'
                            : 'bg-[rgba(139,92,246,0.1)] hover:bg-[rgba(139,92,246,0.2)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)] disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : isSaved ? (
                          <Check size={11} />
                        ) : (
                          <Save size={11} />
                        )}
                      </button>

                      {isConfigured && (
                        <button
                          onClick={() => handleDeleteKey(apiKey.key)}
                          className="px-2 py-2 rounded-lg text-xs text-[#334155] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all border border-transparent hover:border-[rgba(239,68,68,0.2)]"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── RAG Tab ── */}
          {activeTab === 'rag' && (
            <div className="space-y-4">
              <p className="text-[11px] text-[#475569] leading-relaxed">
                Index local files or folders to give ZETA AI memory of your documents.
                Supports .txt, .md, .pdf, .docx, .ts, .js, .py and more.
              </p>

              <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[rgba(139,92,246,0.1)] space-y-3">
                <div className="flex items-center gap-2">
                  <Brain size={13} className="text-[#f59e0b]" />
                  <span className="text-xs font-medium text-[#e2e8f0]">Index Documents</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ragPath}
                    onChange={(e) => setRagPath(e.target.value)}
                    placeholder="/path/to/folder or /path/to/file.pdf"
                    className="flex-1 bg-[#141420] border border-[rgba(139,92,246,0.15)] focus:border-[rgba(139,92,246,0.4)] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#2d3748] outline-none font-mono transition-all"
                  />
                  <button
                    onClick={handleIngestRag}
                    disabled={!ragPath.trim() || ragLoading}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[rgba(245,158,11,0.1)] hover:bg-[rgba(245,158,11,0.2)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)] disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    {ragLoading ? <Loader2 size={11} className="animate-spin" /> : <FolderOpen size={11} />}
                    Index
                  </button>
                </div>

                {ragResult && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)]">
                    <span className="text-[11px] text-[#f59e0b]">
                      ✓ Indexed {ragResult.files} files → {ragResult.chunks} chunks
                    </span>
                    <button
                      onClick={handleClearRag}
                      className="text-[10px] text-[#334155] hover:text-[#ef4444] transition-colors font-mono"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)]">
                <p className="text-[10px] text-[#475569] leading-relaxed">
                  <span className="text-[#f59e0b] font-semibold">Tip:</span> Switch to{' '}
                  <span className="text-[#f59e0b] font-mono">Memory</span> agent mode to query
                  your indexed documents. The more you index, the smarter ZETA becomes.
                </p>
              </div>
            </div>
          )}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="text-lg font-bold gradient-text mb-1">ZETA AI v1.0</h3>
                <p className="text-xs text-[#475569]">Autonomous OS Intelligence Layer</p>
              </div>

              {[
                ['Architecture', 'Electron + React + TypeScript'],
                ['AI Models', 'Gemini 2.0 Flash / Llama 3.3 70B'],
                ['OS Control', 'nut.js · Puppeteer · screenshot-desktop'],
                ['Memory', 'Vector embeddings · cosine similarity'],
                ['Security', 'OS keychain · zero external storage'],
                ['Philosophy', 'Execution over conversation']
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[rgba(139,92,246,0.08)]">
                  <span className="text-[11px] text-[#475569]">{label}</span>
                  <span className="text-[11px] text-[#64748b] font-mono">{val}</span>
                </div>
              ))}

              <div className="pt-2 text-center">
                <a
                  href="https://github.com/bilalaleem5/ZETAAI"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#8b5cf6] hover:underline font-mono"
                >
                  github.com/bilalaleem5/ZETAAI →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
