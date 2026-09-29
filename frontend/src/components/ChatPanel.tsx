import React, { useState } from 'react';
import { Send, Brain, Sparkles, MessageSquare, CornerDownLeft, Trash2, Bot, User } from 'lucide-react';
import { queryAgentChat } from '../services/api';

interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

// Helper to format simplified developer-friendly message text
function renderFormattedMessage(text: string) {
  // If the text contains markdown tables (| ... | ... |), convert them into clean readable list items
  let processed = text;
  if (processed.includes('|') && processed.includes('---')) {
    const lines = processed.split('\n');
    const cleanedLines: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('|---') || line.trim().startsWith('| ---')) continue;
      if (line.includes('|')) {
        const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          cleanedLines.push(`• **${parts[0]}**: ${parts.slice(1).join(' — ')}`);
        } else {
          cleanedLines.push(parts[0] || '');
        }
      } else {
        cleanedLines.push(line);
      }
    }
    processed = cleanedLines.join('\n');
  }

  // Render paragraphs with bold & code backtick formatting
  const lines = processed.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: '4px' }} />;

        // Convert **bold** and `code`
        const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

        return (
          <div key={idx} style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code
                    key={pIdx}
                    style={{
                      padding: '2px 6px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--accent-cyan)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export interface ChatPanelProps {
  onSelectIncident?: (id: string) => void;
  onOpenHandoff?: (id: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onSelectIncident, onOpenHandoff }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'agent',
      text: 'Hello! I am OpsMemory AI. I can investigate past production outages, root causes, and runbooks. Ask me any question below.',
      time: '10:30 AM',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'Show me INC-305',
    'Show me incidents similar to INC-204.',
    'Compare INC-104 and INC-204.',
    'Generate night shift handoff for INC-305',
    'Why is INC-104 similar to INC-204?',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryAgentChat(textToSend);
      const agentMsg: ChatMessage = {
        sender: 'agent',
        text: res.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: '• ⚠️ **Memory Lookup Error**: Unable to complete query. Please verify backend connection.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract unique incident IDs from text
  const extractIncidentIds = (text: string): string[] => {
    const matches = text.match(/INC-\d+/gi);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.toUpperCase())));
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '650px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-badge" style={{ width: '32px', height: '32px' }}>
            <Brain size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Ask OpsMemory</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Natural-Language Organizational Memory Search (Powered by Groq / Hindsight)</div>
          </div>
        </div>
        <button
          onClick={() => setMessages([messages[0]])}
          title="Clear chat history"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
        >
          <Trash2 size={14} />
          <span>Clear</span>
        </button>
      </div>

      {/* Suggested quick prompts */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 0', overflowX: 'auto' }}>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message history */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
        {messages.map((msg, index) => {
          const linkedIds = msg.sender === 'agent' ? extractIncidentIds(msg.text) : [];

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(30, 41, 59, 0.85)',
                  color: '#fff',
                  border: `1px solid ${msg.sender === 'user' ? 'transparent' : 'var(--border-color)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {msg.sender === 'agent' ? (
                  renderFormattedMessage(msg.text)
                ) : (
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>{msg.text}</div>
                )}

                {/* Part 18: One-click interactive navigation buttons in chatbot */}
                {linkedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Operations Navigation:</span>
                    {linkedIds.map((id) => (
                      <React.Fragment key={id}>
                        {onSelectIncident && (
                          <button
                            onClick={() => onSelectIncident(id)}
                            style={{
                              background: 'rgba(6, 182, 212, 0.15)',
                              border: '1px solid rgba(6, 182, 212, 0.4)',
                              color: 'var(--accent-cyan)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Open {id} Detail
                          </button>
                        )}
                        {onOpenHandoff && (
                          <button
                            onClick={() => onOpenHandoff(id)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid var(--border-color)',
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Handoff {id}
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {msg.sender === 'user' ? 'You' : 'OpsMemory AI'} · {msg.time}
              </span>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.82rem', padding: '10px' }}>
            <Sparkles size={16} className="animate-spin" />
            <span>Consulting Groq LLM & Hindsight memory...</span>
          </div>
        )}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: 'flex', gap: '10px', marginTop: '12px' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask OpsMemory about historical incidents, root causes, or runbooks..."
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: '#fff',
            padding: '12px 16px',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
