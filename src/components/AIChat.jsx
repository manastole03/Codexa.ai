import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Copy, RefreshCw, PlusSquare, Replace } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import ACTIONS from '../Actions';

const AIChat = ({ username, onApply, preset, roomId, socketRef }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const backendURL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5000';
  const listRef = useRef(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);

  useEffect(() => {
    if (preset) setInput(preset);
  }, [preset]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${backendURL}/api/room/${roomId}/ai`);
        const d = await r.json();
        if (Array.isArray(d?.messages)) setMessages(d.messages);
      } catch {}
    })();
  }, [roomId]);

  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;
    const handler = ({ messages: newMsgs }) => {
      if (!Array.isArray(newMsgs)) return;
      setMessages((prev) => [...prev, ...newMsgs]);
    };
    s.on?.(ACTIONS.AI_THREAD_UPDATE, handler);
    return () => s.off?.(ACTIONS.AI_THREAD_UPDATE, handler);
  }, [socketRef, roomId]);

  const sendPrompt = async () => {
    const p = input.trim();
    if (!p) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: p, ts: Date.now() }]);
    setInput('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const convo = [...messages, { role: 'user', content: p }].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${backendURL}/api/ai/openrouter`, { method: 'POST', headers, body: JSON.stringify({ messages: convo }) });
      const ct = res.headers.get('content-type') || '';
      let text;
      if (res.ok) {
        const data = ct.includes('application/json') ? await res.json() : { text: await res.text() };
        text = data?.text || data?.choices?.[0]?.message?.content || 'No response';
      } else {
        const err = ct.includes('application/json') ? await res.json() : { error: await res.text() };
        text = err?.error || 'Request failed';
      }
      const ts = Date.now();
      const newMsgs = [{ role: 'assistant', content: text, ts }];
      setMessages((prev) => [...prev, ...newMsgs]);
      try {
        await fetch(`${backendURL}/api/room/${roomId}/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: p, ts }, ...newMsgs] })
        });
      } catch {}
    } catch (e) {
      const ts = Date.now();
      const newMsgs = [{ role: 'assistant', content: 'Request failed', ts }];
      setMessages((prev) => [...prev, ...newMsgs]);
      try {
        await fetch(`${backendURL}/api/room/${roomId}/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: p, ts }, ...newMsgs] })
        });
      } catch {}
    } finally {
      setSending(false);
    }
  };

  const regenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setInput(lastUser.content);
    sendPrompt();
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="aiChatRoot">
      <div className="aiHeader">
        <div className="aiTitle">AI Assistant</div>
        <div className="aiSub">Powered by OpenAI</div>
      </div>
      <div className="aiList" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`aiBubble ${m.role}`}>
            <div className="messageMeta">
              <span className="messageUser">{m.role === 'user' ? username : 'AI'}</span>
              <span className="messageTime">{new Date(m.ts).toLocaleTimeString()}</span>
            </div>
            <div className="aiContent">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
            {m.role === 'assistant' && (
              <div className="aiActions">
                <button className="btn joinBtn" onClick={() => onApply('replace', m.content)}>
                  Replace Editor
                </button>
                <button className="btn joinBtn" onClick={() => onApply('append', m.content)}>
                  Append to Editor
                </button>
                <button className="iconBtn" onClick={() => copyText(m.content)}>
                  <Copy size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
        {sending && <div className="typingDot">...</div>}
      </div>
      <div className="aiInputRow">
        <input
          className="chatInput"
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendPrompt(); } }}
        />
        <button className="btn sendBtn1" onClick={sendPrompt} disabled={sending}>
          <Send size={16} />
        </button>
        <button className="btn" onClick={regenerate} disabled={sending}>
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;