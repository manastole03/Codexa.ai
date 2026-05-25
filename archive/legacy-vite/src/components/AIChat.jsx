import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Copy, RefreshCw, PlusSquare, Replace, Paperclip, Trash, Download, Cog, Sparkles } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';

const AIChat = ({ username, onApply, preset, roomId, socketRef }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const envHasImportMeta = typeof import.meta !== 'undefined' && import.meta && import.meta.env;
  const envHasProcess = typeof process !== 'undefined' && process && process.env;
  const initialModel = (envHasImportMeta && import.meta.env.VITE_OPENROUTER_MODEL) || (envHasProcess && process.env.VITE_OPENROUTER_MODEL) || 'kwaipilot/kat-coder-pro:free';
  const [model, setModel] = useState(initialModel);
  const [temperature, setTemperature] = useState(0.7);
  const [enableRAG, setEnableRAG] = useState(true);
  const [topK, setTopK] = useState(3);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [sourcesMap, setSourcesMap] = useState({});
  const backendURL = (envHasImportMeta && import.meta.env.VITE_BACKEND_URL) || (envHasProcess && process.env.VITE_BACKEND_URL) || 'http://localhost:5000';
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showProjectTools, setShowProjectTools] = useState(false);
  const [projectFiles, setProjectFiles] = useState([]);
  const [targetFile, setTargetFile] = useState('');
  const [targetContent, setTargetContent] = useState('');
  const [dryRun, setDryRun] = useState(true);

  const modelOptions = [
    'kwaipilot/kat-coder-pro:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
  ];

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

  const fetchProjectFiles = async () => {
    try {
      const r = await fetch(`${backendURL}/api/project/files?dir=src`);
      const j = await r.json();
      if (Array.isArray(j.files)) setProjectFiles(j.files);
    } catch {}
  };

  const loadTargetFile = async () => {
    if (!targetFile) return;
    try {
      const r = await fetch(`${backendURL}/api/project/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: targetFile }) });
      const j = await r.json();
      if (j && typeof j.content === 'string') setTargetContent(j.content);
    } catch {}
  };

  const writeTargetFile = async () => {
    if (!targetFile) return;
    try {
      const r = await fetch(`${backendURL}/api/project/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: targetFile, content: targetContent, dryRun }) });
      const j = await r.json();
      if (!r.ok) { toast.error(j?.error || 'Write failed'); return; }
      toast.success(dryRun ? 'Dry-run OK' : 'File written');
    } catch { toast.error('Write failed'); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);

    try {
      const res = await fetch(`${backendURL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        toast.success('File uploaded and processed for RAG');
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      toast.error('Upload error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendPrompt = async () => {
    const p = input.trim();
    if (!p) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: p, ts: Date.now() }]);
    setInput('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const convo = [...messages, { role: 'user', content: p }].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${backendURL}/api/ai/openrouter`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ messages: convo, roomId, model, temperature, systemPrompt, enableRAG, topK, includeCode: true }) 
      });
      const ct = res.headers.get('content-type') || '';
      let text;
      let sources;
      if (res.ok) {
        const data = ct.includes('application/json') ? await res.json() : { text: await res.text() };
        text = data?.text || data?.choices?.[0]?.message?.content || 'No response';
        sources = data?.sources || [];
      } else {
        const err = ct.includes('application/json') ? await res.json() : { error: await res.text() };
        text = err?.error || 'Request failed';
      }
      const ts = Date.now();
      const newMsgs = [{ role: 'assistant', content: text, ts }];
      setMessages((prev) => {
        const next = [...prev, ...newMsgs];
        const idx = next.length - 1;
        if (Array.isArray(sources) && sources.length > 0) {
          setSourcesMap((m) => ({ ...m, [idx]: sources }));
        }
        return next;
      });
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

  const clearChat = async () => {
    try {
      await fetch(`${backendURL}/api/room/${roomId}/ai/clear`, { method: 'POST' });
      setMessages([]);
      setSourcesMap({});
      toast.success('Chat cleared');
    } catch {}
  };

  const exportChat = () => {
    const md = messages.map(m => `**${m.role.toUpperCase()}**\n\n${m.content}\n`).join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${roomId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="aiChatRoot">
      <div className="aiHeader">
        <div className="aiTitle">AI Assistant <span className="pill" title="Model">{model}</span></div>
        <div className="aiSub">Powered by OpenAI & RAG</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn iconBtn" title="Settings" onClick={() => setShowSettings(!showSettings)}>
            <Cog size={16} />
          </button>
          <button className="btn iconBtn" title="Project Tools" onClick={() => { setShowProjectTools(!showProjectTools); if (!showProjectTools) fetchProjectFiles(); }} aria-label="Toggle project tools">
            <PlusSquare size={16} />
          </button>
          <button className="btn iconBtn" title="Quick Presets" onClick={() => setInput('Explain the selected code in simple terms') }>
            <Sparkles size={16} />
          </button>
          <button className="btn iconBtn" title="Export Chat" onClick={exportChat}>
            <Download size={16} />
          </button>
          <button className="btn iconBtn" title="Clear Chat" onClick={clearChat}>
            <Trash size={16} />
          </button>
        </div>
      </div>
      {showProjectTools && (
        <div className="aiSettings" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 8 }}>
          <div>
            <div style={{ fontSize: 12 }}>File</div>
            <select className="inputBox" value={targetFile} onChange={(e)=>setTargetFile(e.target.value)} aria-label="Select project file">
              <option value="">Select a file</option>
              {projectFiles.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button className="btn joinBtn" onClick={loadTargetFile}>Load</button>
              <label style={{ display:'flex', alignItems:'center', gap:6 }}><input type="checkbox" checked={dryRun} onChange={(e)=>setDryRun(e.target.checked)} />Dry-run</label>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12 }}>Content</div>
            <textarea className="chatInput" value={targetContent} onChange={(e)=>setTargetContent(e.target.value)} placeholder="Edit file content" aria-label="File content" />
            <div style={{ display:'flex', gap:8, marginTop:8, justifyContent:'flex-end' }}>
              <button className="btn joinBtn" onClick={writeTargetFile}>Write</button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="aiSettings" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 8 }}>
          <div>
            <div style={{ fontSize: 12 }}>Model</div>
            <select className="inputBox" value={model} onChange={(e) => setModel(e.target.value)}>
              {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12 }}>Temperature</div>
            <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
          </div>
          <div>
            <div style={{ fontSize: 12 }}>RAG</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={enableRAG} onChange={(e) => setEnableRAG(e.target.checked)} />
              <span>Enable</span>
            </label>
          </div>
          <div>
            <div style={{ fontSize: 12 }}>Top K</div>
            <input type="number" min="1" max="10" value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="inputBox" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12 }}>System Prompt</div>
            <textarea className="chatInput" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Optional system instructions" />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button className="btn joinBtn" onClick={() => setInput('Explain the code in the active editor clearly.')}>Explain Code</button>
            <button className="btn joinBtn" onClick={() => setInput('Refactor the code to improve readability and performance.')}>Refactor Code</button>
            <button className="btn joinBtn" onClick={() => setInput('Write unit tests for the code presented.')}>Write Tests</button>
            <button className="btn joinBtn" onClick={() => setInput('Find bugs and suggest fixes in the code.')}>Find Bugs</button>
          </div>
        </div>
      )}
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
            {m.role === 'assistant' && Array.isArray(sourcesMap[i]) && sourcesMap[i].length > 0 && (
              <div className="aiSources" style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Sources</div>
                {sourcesMap[i].map((s, idx) => (
                  <div key={idx} className="sourceItem" style={{ fontSize: 12, borderLeft: '3px solid #888', paddingLeft: 8, marginTop: 4 }}>
                    <div style={{ fontWeight: 600 }}>{s.source || 'Document'}</div>
                    <div>{s.snippet}</div>
                  </div>
                ))}
              </div>
            )}
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
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileSelect}
            accept=".pdf,.txt,.md"
        />
        <button 
            className="btn iconBtn" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading || sending} 
            title="Upload context (PDF, TXT, MD)"
            style={{ marginRight: '8px' }}
        >
            <Paperclip size={16} />
        </button>
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
