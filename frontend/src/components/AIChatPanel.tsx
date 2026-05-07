import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../lib/api'
import { streamChat } from '../lib/api'
import { Spinner } from './Spinner'

interface Props {
  meetingId: string | null
  meetingTitle?: string
  isOpen: boolean
  onClose: () => void
}

const SUGGESTED: Record<'meeting' | 'general', string[]> = {
  meeting: [
    'Summarise the key outcomes in 3 bullet points',
    'Who owns the most action items?',
    'What are the biggest risks flagged?',
    'Draft a follow-up email to attendees',
    'What decisions were made and why?',
    'What should be on the next meeting agenda?',
  ],
  general: [
    'How do I upload a recording?',
    'What industries does Prism support?',
    'How do action items get assigned owners?',
    'What is the sentiment score?',
    'How do I create a workspace?',
  ],
}

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-black text-white">
      P
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
      You
    </div>
  )
}

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {isUser ? <UserAvatar /> : <AssistantAvatar />}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-violet-600 text-white rounded-tr-none'
            : 'bg-slate-100 text-slate-800 rounded-tl-none'
        }`}
      >
        {msg.content || (isStreaming ? <span className="inline-flex gap-1"><span className="animate-bounce">·</span><span className="animate-bounce [animation-delay:150ms]">·</span><span className="animate-bounce [animation-delay:300ms]">·</span></span> : '')}
      </div>
    </div>
  )
}

export function AIChatPanel({ meetingId, meetingTitle, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef(false)

  const suggested = meetingId ? SUGGESTED.meeting : SUGGESTED.general

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  async function send(text: string) {
    if (!text.trim() || streaming) return
    setError('')
    setInput('')
    abortRef.current = false

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    await streamChat(
      [...messages, userMsg],
      meetingId,
      (chunk) => {
        if (abortRef.current) return
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      },
      () => setStreaming(false),
      (err) => {
        setError(err)
        setStreaming(false)
        setMessages(prev => prev.slice(0, -1)) // remove empty assistant bubble
      },
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function clear() {
    abortRef.current = true
    setMessages([])
    setError('')
    setStreaming(false)
  }

  if (!isOpen) return null

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <AssistantAvatar />
          <div>
            <p className="text-sm font-semibold text-slate-800">Prism AI</p>
            <p className="text-xs text-slate-400">
              {meetingTitle ? `Scoped to: ${meetingTitle}` : 'General assistant'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clear}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex gap-2.5">
              <AssistantAvatar />
              <div className="rounded-2xl rounded-tl-none bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                {meetingId
                  ? `Hi! I have the full context for "${meetingTitle}". Ask me anything about this meeting.`
                  : "Hi! I'm Prism AI. Ask me about your meetings, how to use Prism, or meeting best practices."}
              </div>
            </div>

            <div>
              <p className="mb-2 pl-9 text-xs text-slate-400">Suggested questions</p>
              <div className="space-y-1.5 pl-9">
                {suggested.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs text-rose-600">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-violet-400 focus-within:bg-white transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this meeting…"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            {streaming ? <Spinner size="sm" /> : '↑'}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-slate-400">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
