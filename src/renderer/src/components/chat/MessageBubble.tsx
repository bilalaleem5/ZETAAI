import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Zap, User, FolderOpen, Globe, Brain, Code2 } from 'lucide-react'
import { Message, AgentMode } from '../../store'

interface Props {
  message: Message
  isLast: boolean
}

const AGENT_COLORS: Record<AgentMode, string> = {
  auto: '#8b5cf6',
  coder: '#06b6d4',
  web: '#10b981',
  rag: '#f59e0b',
  builder: '#ec4899',
  os: '#ef4444'
}

const AGENT_ICONS: Record<AgentMode, React.ReactNode> = {
  auto: <Zap size={12} />,
  coder: <Code2 size={12} />,
  web: <Globe size={12} />,
  rag: <Brain size={12} />,
  builder: <FolderOpen size={12} />,
  os: <Zap size={12} />
}

function CopyButton({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[#64748b] hover:text-[#94a3b8] transition-all"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  )
}

export function MessageBubble({ message, isLast }: Props): React.ReactElement {
  const isUser = message.role === 'user'
  const agentColor = message.agentMode ? AGENT_COLORS[message.agentMode] : '#8b5cf6'
  const agentIcon = message.agentMode ? AGENT_ICONS[message.agentMode] : <Zap size={12} />

  if (isUser) {
    return (
      <div className="flex justify-end py-2 animate-slide-up">
        <div className="max-w-[75%]">
          <div className="bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.25)] rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm text-[#e2e8f0] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] flex items-center justify-center flex-shrink-0 ml-2 mt-1">
          <User size={12} className="text-[#8b5cf6]" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 py-3 ${isLast ? 'animate-slide-up' : ''}`}>
      {/* Agent avatar */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border"
        style={{
          background: `${agentColor}18`,
          borderColor: `${agentColor}30`,
          color: agentColor
        }}
      >
        {agentIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Agent label */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: agentColor }}
          >
            {message.agentMode ?? 'zeta'}
          </span>
          {message.isStreaming && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: agentColor }} />
              <span className="text-[9px] text-[#475569] font-mono">generating</span>
            </span>
          )}
          {message.error && (
            <span className="text-[9px] text-[#ef4444] font-mono">error</span>
          )}
        </div>

        {/* Message body */}
        <div className={`prose-zeta text-sm leading-relaxed ${message.error ? 'text-[#fca5a5]' : 'text-[#cbd5e1]'}`}>
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isBlock = !!match
                  const codeStr = String(children).replace(/\n$/, '')
                  if (isBlock) {
                    return (
                      <div className="relative group my-3">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d0d18] border border-[rgba(139,92,246,0.15)] rounded-t-lg">
                          <span className="text-[10px] font-mono text-[#475569] uppercase tracking-wider">
                            {match[1]}
                          </span>
                          <CopyButton text={codeStr} />
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0 0 8px 8px',
                            borderTop: 'none',
                            border: '1px solid rgba(139,92,246,0.15)',
                            background: '#0d0d18',
                            fontSize: '12px'
                          }}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code className="font-mono" {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : message.isStreaming ? null : (
            <span className="text-[#334155] italic text-xs">Empty response</span>
          )}
          {message.isStreaming && <span className="animate-cursor text-[#8b5cf6] ml-0.5">▋</span>}
        </div>

        {/* Artifacts */}
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(message.artifacts as Array<{ type: string; path?: string; url?: string; results?: unknown[] }>).map((artifact, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)] text-[11px] text-[#8b5cf6]"
              >
                {artifact.type === 'file_written' && <Code2 size={10} />}
                {artifact.type === 'website_built' && <Globe size={10} />}
                {artifact.type === 'search_results' && <Globe size={10} />}
                {artifact.type === 'rag_results' && <Brain size={10} />}
                <span className="font-mono">
                  {artifact.type === 'file_written' && `Saved: ${artifact.path?.split('/').pop()}`}
                  {artifact.type === 'website_built' && `Site built: ${artifact.path?.split('/').pop()}`}
                  {artifact.type === 'search_results' && `${(artifact.results as unknown[])?.length ?? 0} results`}
                  {artifact.type === 'rag_results' && `${(artifact.results as unknown[])?.length ?? 0} chunks retrieved`}
                  {!['file_written', 'website_built', 'search_results', 'rag_results'].includes(artifact.type) && artifact.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
