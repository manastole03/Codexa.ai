import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Client from '../components/Client';
import { Share as ShareIcon, Download as DownloadIcon, Save as SaveIcon, Play as PlayIcon, Upload as UploadIcon, Eye as EyeIcon, EyeOff as EyeOffIcon, Copy as CopyIcon, Trash as TrashIcon, Plus as PlusIcon, ExternalLink as ExternalLinkIcon, FlaskConical as FlaskIcon, Sparkles as SparklesIcon } from 'lucide-react';
import { lazy, Suspense } from 'react'
import Skeleton from '../components/Skeleton'
import ErrorBoundary from '../components/ErrorBoundary'
const Editor = lazy(() => import('../components/Editor'))
const AIChat = lazy(() => import('../components/AIChat'))
const LeetCodePanel = ({ roomId, backendURL, lang, onLoad }) => {
  const [problems, setProblems] = useRecoilState(lcProblems);
  const [query, setQuery] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('');
  const [selected, setSelected] = useRecoilState(lcSelectedProblem);
  const [loading, setLoading] = React.useState(false);
  const [detLoading, setDetLoading] = React.useState(false);
  const [details, setDetails] = React.useState(null);
  const [el5Open, setEl5Open] = React.useState(false);
  const [el5Loading, setEl5Loading] = React.useState(false);
  const [el5Text, setEl5Text] = React.useState('');
  const [sort] = React.useState('relevance');
  const [drawerOpen, setDrawerOpen] = useRecoilState(lcDrawerOpen);
  React.useEffect(()=>{ (async()=>{ try{ setLoading(true);
      const base = 'https://leetcode-api-pied.vercel.app/problems';
      const parseList = (j) => Array.isArray(j)? j : (Array.isArray(j?.problems)? j.problems : (Array.isArray(j?.data)? j.data : []));
      const hasMoreFlag = (j, listLen) => { const hm = !!(j?.hasMore || j?.hasNextPage); const total = Number(j?.total || j?.count || 0); const page = Number(j?.page || j?.currentPage || 1); const size = Number(j?.pageSize || j?.limit || listLen || 0); if (hm) return true; if (total && size) return (page*size) < total; return false; };
      async function tryFetch(url){ const r = await fetch(url); if (!r.ok) throw new Error('fetch failed'); return await r.json(); }
      let results = [];
      try {
        // Attempt paginated fetch
        let page = 1; let attempts = 0; while (attempts < 20) { attempts++; const j = await tryFetch(`${base}?page=${page}`); const list = parseList(j); if (!Array.isArray(list) || list.length===0) break; results = results.concat(list); if (!hasMoreFlag(j, list.length)) break; page++; }
        if (results.length === 0) {
          // Try large limit
          const j1 = await tryFetch(`${base}?limit=500`); const list1 = parseList(j1); if (Array.isArray(list1) && list1.length>0) results = list1;
        }
        if (results.length === 0) {
          const j0 = await tryFetch(base); const list0 = parseList(j0); if (Array.isArray(list0)) results = list0;
        }
        // Try other common keys
        if (results.length === 0) {
          const jx = await tryFetch(base); const keys = Object.keys(jx||{}); const arrKey = keys.find(k=> Array.isArray(jx[k])); if (arrKey) results = jx[arrKey];
        }
      } catch {}
      if (results.length>0) { setProblems(results); setSelected(results[0]||null); }
      else { try { const rb = await fetch(`${backendURL}/api/leetcode/problems`); const jb = await rb.json(); const list = Array.isArray(jb?.problems)? jb.problems : []; setProblems(list); if (!selected) setSelected(list[0]||null); } catch {} }
    } catch { } finally { setLoading(false); } })(); }, [backendURL]);
  const filt = (s) => String(s||'').toLowerCase();
  const getTags = (p) => Array.isArray(p.topicTags) ? p.topicTags.map(t=>t.name||t.slug||'') : (Array.isArray(p.tags)?p.tags:[]);
  const getDiff = (p) => String(p.difficulty||'').toLowerCase();
  const filtered = problems.filter(p => { const d = difficulty ? (getDiff(p)===difficulty.toLowerCase()) : true; const title=filt(p.title||p.name||p?.questionTitle); const tagsStr=filt(getTags(p).join(' ')); const q=query.trim().toLowerCase(); const matches=!q || title.includes(q) || tagsStr.includes(q); return d && matches; });
  const sorted = [...filtered].sort((a,b)=>{ if (sort==='title') return (a.title||a.name||'').localeCompare(b.title||b.name||''); if (sort==='difficulty') return getDiff(a).localeCompare(getDiff(b)); return 0; });
  const mapLang = (l) => { if (l==='javascript' || l==='jsx') return 'javascript'; if (l==='python') return 'python'; return l; };
  const sanitizeHtml = (html) => String(html||'').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,'');
  const selContent = (p) => sanitizeHtml(p?.content || p?.desc || p?.description || '');
  const detContent = () => sanitizeHtml(details?.content || details?.desc || details?.description || selContent(selected));
  const htmlToText = (h) => String(h||'').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const extractSection = (html, key) => {
    try {
      const s = String(html||'');
      const re = new RegExp(`<h\d[^>]*>\s*${key}[^<]*<\\/h\d>|<strong[^>]*>\s*${key}[^<]*<\\/strong>`, 'i');
      const idx = s.search(re);
      if (idx < 0) return '';
      const after = s.slice(idx);
      const nextHead = after.search(/<h\d[^>]*>|<strong[^>]*>/i);
      if (nextHead > 0) return after.slice(0, nextHead);
      return after;
    } catch { return ''; }
  };
  const getId = (p) => p?.slug || p?.frontendQuestionId || p?.questionFrontendId || (p?.title ? p.title.toLowerCase().replace(/\s+/g,'-') : '');
  const getSlug = (p) => p?.slug || (p?.title ? p.title.toLowerCase().replace(/\s+/g,'-') : '');
  const loadDetails = async (p) => {
    try {
      setDetLoading(true);
      const slug = getSlug(p);
      const id = getId(p);
      async function tryOne(url) { const r = await fetch(url); if (!r.ok) throw new Error('failed'); return await r.json(); }
      let j = null;
      try { j = await tryOne(`${backendURL}/api/leetcode/problem/${slug || id}`); }
      catch { try { j = await tryOne(`https://leetcode-api-pied.vercel.app/problem/${slug || id}`); } catch {}
      }
      if (j && (j.problem || j.content || j.desc || j.description)) {
        const prob = j.problem || j;
        setDetails(prob);
      }
    } finally { setDetLoading(false); }
  };
  const explainEL5 = async (p) => {
    try {
      setEl5Open(true); setEl5Loading(true); setEl5Text('');
      const slug = getSlug(p); const id = getId(p);
      let descHtml = '';
      try { const r = await fetch(`${backendURL}/api/leetcode/problem/${slug || id}`); const j = await r.json(); descHtml = j?.problem?.description || j?.description || ''; } catch {}
      const baseText = htmlToText(descHtml || detContent());
      let text = '';
      try {
        const messages = [
          { role: 'system', content: 'You explain coding problems simply. No code. Use short bullets and tiny examples.' },
          { role: 'user', content: `Explain this LeetCode problem like I am 5. Give:\n- One-sentence goal\n- Simple steps to think\n- 3 short one-line examples (Input -> Output)\n- Avoid jargon, keep it concise.\n\nProblem:\n${baseText}` }
        ];
        const r2 = await fetch(`${backendURL}/api/ai/openrouter`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ messages }) });
        const j2 = await r2.json();
        text = j2?.text || '';
      } catch {}
      if (!text || !text.trim()) {
        const title = p?.title || p?.name || 'This problem';
        const exHtml = extractSection(descHtml || detContent(), 'Example') || '';
        const exText = htmlToText(exHtml).split('\n').filter(Boolean).slice(0,3).map(s=>`- ${s}`).join('\n');
        text = `${title} in simple words:\n- Goal: ${baseText.split('.').slice(0,1).join('.')}\n- Think: match, count, or follow steps from the prompt.\nExamples:\n${exText || '- (example not available)'}`;
      }
      setEl5Text(text);
    } finally { setEl5Loading(false); }
  };
  const doLoad = async (p) => { const prob = p || selected; if (!prob) return; const id = getId(prob); try { const r = await fetch(`${backendURL}/api/room/${roomId}/leetcode/load`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, language: mapLang(lang) }) }); const j = await r.json(); if (!r.ok) { toast.error(j?.error||'Load failed'); return; } onLoad(j.code || '', j.testcases || []); toast.success('Problem loaded'); } catch { toast.error('Load failed'); } };
  const ratioCols = '36% 64%';
  const diffClass = (p) => getDiff(p)==='easy'?'diff-easy':(getDiff(p)==='medium'?'diff-medium':'diff-hard');
  return (
    <div className="lcWrap">
      <div className="lcHeader">
        <input className="lcSearch" placeholder="Search problems or tags" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <select className="lcSelect" value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} aria-label="Filter difficulty">
          <option value="">All</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div className="lcBody" style={{ gridTemplateColumns: '1fr' }}>
        <div className="lcList">
          {loading && <Skeleton lines={6} />}
          {!loading && sorted.map(p => (
            <div key={getId(p)} className="lcItem" onClick={()=>{ setSelected(p); setDrawerOpen(true); loadDetails(p); }}>
              <div className="lcTitle">{p.title || p.name}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
                <button className="lcButton ghost" title="Open Preview" onClick={(e)=>{ e.stopPropagation(); setSelected(p); setDrawerOpen(true); loadDetails(p); }}><ExternalLinkIcon size={16} /></button>
                <button className="lcButton" title="Load Testcases" onClick={(e)=>{ e.stopPropagation(); setSelected(p); doLoad(p); }}><FlaskIcon size={16} /></button>
                <button className="lcButton ghost" title="Explain Like I am 5" onClick={(e)=>{ e.stopPropagation(); setSelected(p); explainEL5(p); }}><SparklesIcon size={16} /></button>
              </div>
              <div className="lcTags" style={{ marginTop:6 }}>{getTags(p).map((t,i)=> (<span key={i} className="pill ghost" style={{ marginRight:6 }}>{t}</span>))}</div>
            </div>
          ))}
          {!loading && sorted.length===0 && <div className="aiBubble">No problems match</div>}
        </div>
        {drawerOpen && selected && (
          <div className="drawer">
            <div className="drawerBackdrop" onClick={()=> setDrawerOpen(false)} />
            <div className="drawerPanel">
              <button className="drawerClose" onClick={()=> setDrawerOpen(false)}>×</button>
              <div className="lcCard">
                <div className="lcTitle">{selected.title || selected.name}</div>
                <div className="lcMeta" style={{ marginTop:6 }}>
                  <span className={`pill ${diffClass(selected)}`}>{selected.difficulty || 'Unknown'}</span>
                </div>
                <div className="lcTags" style={{ marginTop:6 }}>{getTags(selected).map((t,i)=> (<span key={i} className="pill ghost" style={{ marginRight:6 }}>{t}</span>))}</div>
                <div style={{ display:'flex', gap:8, marginTop:6 }}>
                  <button className="lcButton" title="Load Testcases" onClick={()=>{ doLoad(selected); }}><FlaskIcon size={16} /></button>
                </div>
                {detLoading && <Skeleton lines={6} />}
                {!detLoading && (
                  <>
                    <div className="lcDesc" dangerouslySetInnerHTML={{ __html: detContent() }} />
                    {(() => { const ex = extractSection(detContent(), 'Example'); return ex ? (<div className="lcCard" style={{ marginTop:8 }} dangerouslySetInnerHTML={{ __html: ex }} />) : null; })()}
                    {(() => { const cs = extractSection(detContent(), 'Constraints'); return cs ? (<div className="lcCard" style={{ marginTop:8 }} dangerouslySetInnerHTML={{ __html: cs }} />) : null; })()}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {el5Open && (
          <div className="drawer">
            <div className="drawerBackdrop" onClick={()=> setEl5Open(false)} />
            <div className="drawerPanel el5">
              <button className="drawerClose" onClick={()=> setEl5Open(false)}>×</button>
              <div className="lcCard">
                <div className="lcTitle">Explain Like I am 5</div>
                {el5Loading ? <Skeleton lines={6} /> : (<div className="lcDesc"><pre style={{ whiteSpace:'pre-wrap' }}>{el5Text}</pre></div>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import { language, cmtheme, lcProblems, lcSelectedProblem, lcDrawerOpen } from '../../src/atoms';
import { useRecoilState } from 'recoil';
import ACTIONS from '../Actions';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {

    const [lang, setLang] = useRecoilState(language);
    const [them, setThem] = useRecoilState(cmtheme);

    const [clients, setClients] = useState([]);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [activeTab, setActiveTab] = useState('chat');
    const [aiPresetInput, setAiPresetInput] = useState('');
    const [ownerSocketId, setOwnerSocketId] = useState(null);
    const [tabs, setTabs] = useState([{ id: 'tab-1', title: 'Tab 1', shared: true }]);
    const [activeTabId, setActiveTabId] = useState('tab-1');
    const [tabCodes, setTabCodes] = useState({ 'tab-1': '' });
    const [externalCode, setExternalCode] = useState('');
    const [acceptRemote, setAcceptRemote] = useState(true);
    const [consoleOpen, setConsoleOpen] = useState(true);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [consoleErrors, setConsoleErrors] = useState([]);
    const [testInput, setTestInput] = useState('');
    const [activeConsoleTab, setActiveConsoleTab] = useState('output');
    const [autoScrollConsole, setAutoScrollConsole] = useState(true);
    const [running, setRunning] = useState(false);
    const [consoleHeight, setConsoleHeight] = useState(() => {
        try { return Math.max(180, Math.min(420, Math.floor((typeof window!=='undefined'?window.innerHeight:800) * 0.28))); } catch { return 240; }
    });
    const envHasImportMeta = typeof import.meta !== 'undefined' && import.meta && import.meta.env;
    const envHasProcess = typeof process !== 'undefined' && process && process.env;
    const backendURL = (envHasImportMeta && import.meta.env.VITE_BACKEND_URL) || (envHasProcess && process.env.VITE_BACKEND_URL) || 'http://localhost:5000';
    const [showTestcases, setShowTestcases] = useState(true);
    const [testcases, setTestcases] = useState([]);
    const debounceRef = useRef(null);
    const [splitEnabled, setSplitEnabled] = useState(false);
    const [splitOrientation, setSplitOrientation] = useState('vertical');
    const [splitRatio, setSplitRatio] = useState(50);
    const [splitLeftTabId, setSplitLeftTabId] = useState(null);
    const [splitRightTabId, setSplitRightTabId] = useState(null);
    const importInputRef = useRef(null);
    const [showHidden, setShowHidden] = useState(false);
    const [tabMenu, setTabMenu] = useState({ open: false, x: 0, y: 0, tabId: '' });


    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const workerRef = useRef(null);
    const iframeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId, roomOwner }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(
                        clients.map((c) => ({
                            ...c,
                            username: c.username || (c.socketId === socketRef.current?.id ? location.state?.username : 'Unknown')
                        }))
                    );
                    setOwnerSocketId(roomOwner);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        roomId,
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );

            // Listening for chat messages
            socketRef.current.on(
                ACTIONS.CHAT_MESSAGE,
                ({ username, message, timestamp }) => {
                    setMessages((prev) => [
                        ...prev,
                        { username, message, timestamp },
                    ]);
                }
            );
            socketRef.current.on(ACTIONS.KICKED, ({ roomId: kickedRoom }) => {
                if (kickedRoom === roomId) {
                    toast.error('You have been removed by the room owner');
                    reactNavigator('/');
                }
            });
            socketRef.current.on(ACTIONS.ROOM_DELETED, ({ roomId: deletedRoom }) => {
                if (deletedRoom === roomId) {
                    toast('Room has been closed by the owner');
                    reactNavigator('/');
                }
            });
            socketRef.current.on(ACTIONS.TABS_UPDATE, ({ tabs }) => {
                if (Array.isArray(tabs)) {
                    setTabs((prev) => {
                        const existing = new Set(prev.map(t => t.id));
                        const merged = tabs.map(t => ({ ...t, shared: true }));
                        return merged;
                    });
                    setTabCodes((prev) => {
                        const next = { ...prev };
                        for (const t of tabs) {
                            if (!(t.id in next)) next[t.id] = '';
                        }
                        return next;
                    });
                }
            });
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ tabId, code }) => {
                if (!tabId) return;
                setTabCodes((prev) => ({ ...prev, [tabId]: code }));
                if (tabId === activeTabId) setExternalCode(code);
            });
        };
        init();
        return () => {
            socketRef.current?.off(ACTIONS.JOINED);
            socketRef.current?.off(ACTIONS.DISCONNECTED);
            socketRef.current?.off(ACTIONS.CHAT_MESSAGE);
            socketRef.current?.off(ACTIONS.KICKED);
            socketRef.current?.off(ACTIONS.ROOM_DELETED);
            socketRef.current?.off(ACTIONS.TABS_UPDATE);
            socketRef.current?.off(ACTIONS.CODE_CHANGE);
            socketRef.current?.disconnect();
        };
    }, []);


    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    function deleteRoom() {
        try {
            socketRef.current?.emit(ACTIONS.DELETE_ROOM, { roomId });
            toast.success('Room closed');
            reactNavigator('/');
        } catch (e) {
            toast.error('Failed to delete room');
        }
    }

    function removeParticipant(targetSocketId) {
        try {
            socketRef.current?.emit(ACTIONS.REMOVE_PARTICIPANT, { roomId, targetSocketId });
        } catch (e) {
            toast.error('Failed to remove participant');
        }
    }

    function shareRoom() {
        const shareUrl = `${window.location.origin}/editor/${roomId}`;
        const text = `Join my Codexa.ai room (${roomId}) at ${shareUrl}`;
        if (navigator.share) {
            navigator.share({ title: 'Codexa.ai Room', text, url: shareUrl }).catch(() => {});
        } else {
            const encoded = encodeURIComponent(text);
            const wa = `https://api.whatsapp.com/send?text=${encoded}`;
            const line = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
            const gmail = `mailto:?subject=${encodeURIComponent('Join my Codexa.ai room')}&body=${encoded}`;
            window.open(wa, '_blank');
            window.open(line, '_blank');
            window.open(gmail, '_self');
        }
    }


    function applyAiToEditor(text, mode) {
        const current = codeRef.current || '';
        const next = mode === 'replace' ? text : `${current}\n${text}`;
        setTabCodes((prev) => ({ ...prev, [activeTabId]: next }));
        setExternalCode(next);
        try {
            socketRef.current?.emit(ACTIONS.CODE_CHANGE, { roomId, tabId: activeTabId, code: next });
        } catch {}
    }


    const username = (location.state?.username) || (localStorage.getItem('username')) || 'Guest';

    function sendMessage() {
        const msg = chatInput.trim();
        if (!msg) return;
        try {
            socketRef.current?.emit(ACTIONS.CHAT_MESSAGE, {
                roomId,
                username,
                message: msg,
                timestamp: Date.now(),
            });
            setChatInput('');
        } catch (e) {
            toast.error('Failed to send message');
        }
    }

    function handleChatKey(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    }

    function addTab() {
        const id = `tab-${Date.now()}`;
        const title = `Tab ${tabs.length + 1}`;
        const nextTabs = [...tabs, { id, title, shared: true }];
        setTabs(nextTabs);
        setTabCodes((prev) => ({ ...prev, [id]: '' }));
        setActiveTabId(id);
        setExternalCode('');
        setAcceptRemote(true);
        try { socketRef.current?.emit(ACTIONS.TAB_CREATE, { roomId, tab: { id, title } }); } catch {}
    }

    function switchTab(id) {
        setActiveTabId(id);
        const code = tabCodes[id] || '';
        setExternalCode(code);
        setAcceptRemote(true);
        if (splitEnabled) setSplitLeftTabId(id);
    }

    function shareActiveTab() {
        const code = tabCodes[activeTabId] || '';
        try {
            socketRef.current?.emit(ACTIONS.CODE_CHANGE, { roomId, code });
            setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, shared: true } : t));
            setAcceptRemote(true);
        } catch {}
    }

    function downloadActiveTab() {
        const code = tabCodes[activeTabId] || '';
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tabs.find(t => t.id === activeTabId)?.title || 'tab'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function saveCurrentTab() {
        try {
            const metaKey = `roomTabs:${roomId}`;
            localStorage.setItem(metaKey, JSON.stringify({ tabs }));
            const docKey = `roomDoc:${roomId}:${activeTabId}`;
            const code = tabCodes[activeTabId] || '';
            localStorage.setItem(docKey, code);
            toast.success('Tab saved');
        } catch {}
    }

    useEffect(() => {
        try {
            const metaKey = `roomTabs:${roomId}`;
            const raw = localStorage.getItem(metaKey);
            let loadedTabs = [{ id: 'tab-1', title: 'Tab 1' }];
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.tabs) && parsed.tabs.length > 0) {
                    loadedTabs = parsed.tabs.map(t => ({ ...t, shared: true }));
                }
            }
            const nextCodes = {};
            for (const t of loadedTabs) {
                const docKey = `roomDoc:${roomId}:${t.id}`;
                nextCodes[t.id] = localStorage.getItem(docKey) || '';
            }
            setTabs(loadedTabs);
            setTabCodes(nextCodes);
            const firstId = loadedTabs[0]?.id || 'tab-1';
            setActiveTabId(firstId);
            setExternalCode(nextCodes[firstId] || '');
            setAcceptRemote(true);
        } catch {}
    }, [roomId]);

    const messagesRef = useRef(null);
    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const runCode = () => {
        const code = codeRef.current || '';
        if (!code.trim()) { toast.error('Nothing to run'); return; }
        setConsoleOpen(true);
        setConsoleLogs((prev) => [...prev, { t: 'info', m: `Running ${lang}...` }]);
        setConsoleErrors((prev) => prev);
        setRunning(true);
        if (workerRef.current) { try { workerRef.current.terminate(); } catch {} }
        if ((lang === 'javascript' || lang === 'jsx') && !useBackendRun) {
            const workerCode = `
                const lines = [];
                let idx = 0;
                function readLine(){ return (idx < lines.length) ? lines[idx++] : ''; }
                self.prompt = function(){ return readLine(); };
                self.console = {
                    log: (...a)=>self.postMessage({t:'log', m:a.map(v=>String(v)).join(' ') }),
                    error: (...a)=>self.postMessage({t:'error', m:a.map(v=>String(v)).join(' ') })
                };
                self.onmessage = (e)=>{
                    const code = e.data.code;
                    const input = e.data.input || '';
                    lines.splice(0, lines.length, ...String(input).split(/\r?\n/)); idx = 0;
                    try { eval(code); self.postMessage({t:'done'});} catch(err){ self.postMessage({t:'error', m: err.stack || String(err)}); }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const w = new Worker(url);
            workerRef.current = w;
            w.onmessage = (e) => {
                const { t, m } = e.data || {};
                if (t === 'done') { setRunning(false); setConsoleLogs((prev) => [...prev, { t: 'info', m: 'Completed' }]); }
                else if (t === 'error') setConsoleErrors((prev) => [...prev, { t, m }]);
                else setConsoleLogs((prev) => [...prev, { t, m }]);
            };
            w.onerror = (err) => { setConsoleErrors((prev) => [...prev, { t: 'error', m: String(err.message || err) }]); setRunning(false); };
            w.postMessage({ code, input: testInput });
        } else if (lang === 'htmlmixed') {
            const safeInput = testInput.replace(/<\/?script>/gi, '');
            const injected = `${code}\n<script> (function(){
                window.readLine = (function(){ const lines = String(${JSON.stringify(testInput)}).split(/\\r?\\n/); let i=0; return function(){ return i<lines.length?lines[i++]:''; }; })();
                const orgLog = console.log; const orgErr = console.error;
                console.log = function(){ parent.postMessage({ __previewLog: Array.from(arguments).map(String).join(' ') }, '*'); return orgLog.apply(console, arguments); };
                console.error = function(){ parent.postMessage({ __previewError: Array.from(arguments).map(String).join(' ') }, '*'); return orgErr.apply(console, arguments); };
            })();<\/script>`;
            if (iframeRef.current) {
                iframeRef.current.srcdoc = injected;
                setRunning(false);
                setConsoleLogs((prev) => [...prev, { t: 'info', m: 'Preview updated' }]);
            }
        } else {
            const mapLang = (l) => {
                if (l === 'javascript' || l === 'jsx') return 'javascript';
                if (l === 'python') return 'python';
                if (l === 'shell') return 'bash';
                if (l === 'dockerfile') return 'bash';
                if (l === 'clike') return 'cpp';
                if (l === 'go') return 'go';
                if (l === 'rust') return 'rust';
                if (l === 'java') return 'java';
                if (l === 'typescript') return 'typescript';
                return null;
            };
            const serverLang = mapLang(lang);
            if (!serverLang) {
                setConsoleErrors((prev) => [...prev, { t: 'error', m: `Run not supported for ${lang}` }]);
                setRunning(false);
                return;
            }
            (async () => {
                try {
                    const r = await fetch(`${backendURL}/api/run`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ language: serverLang, code, stdin: testInput, useDocker: ['cpp','go','rust','java'].includes(serverLang) })
                    });
                    const j = await r.json();
                    if (!r.ok) {
                        setConsoleErrors((prev) => [...prev, { t: 'error', m: j?.error || 'Run failed' }]);
                    } else {
                        if (j.stdout) setConsoleLogs((prev) => [...prev, { t: 'log', m: j.stdout }]);
                        if (j.stderr) setConsoleErrors((prev) => [...prev, { t: 'error', m: j.stderr }]);
                        setConsoleLogs((prev) => [...prev, { t: 'info', m: `Exit ${j.exitCode} in ${j.durationMs}ms` }]);
                    }
                } catch (e) {
                    setConsoleErrors((prev) => [...prev, { t: 'error', m: 'Server run failed' }]);
                } finally {
                    setRunning(false);
                }
            })();
        }
    };

    useEffect(() => {
        const onMsg = (e) => {
            const d = e.data || {};
            if (d.__previewLog) setConsoleLogs((prev) => [...prev, { t: 'log', m: d.__previewLog }]);
            if (d.__previewError) setConsoleLogs((prev) => [...prev, { t: 'error', m: d.__previewError }]);
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, []);

    

    const clearConsole = () => { setConsoleLogs([]); setConsoleErrors([]); };
    const clearInput = () => { setTestInput(''); };
    const copyActive = async () => {
        try {
            let text = '';
            if (activeConsoleTab==='output') text = consoleLogs.map(l=>l.m).join('\n');
            else if (activeConsoleTab==='errors') text = consoleErrors.map(l=>l.m).join('\n');
            else text = testInput;
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {}
    };

    useEffect(() => {
        if (!autoScrollConsole) return;
        if (activeConsoleTab==='output') {
            const el = document.getElementById('consoleOutput');
            if (el) el.scrollTop = el.scrollHeight;
        } else if (activeConsoleTab==='errors') {
            const el = document.getElementById('consoleErrors');
            if (el) el.scrollTop = el.scrollHeight;
        }
    }, [consoleLogs, consoleErrors, activeConsoleTab, autoScrollConsole]);

    const onStartResize = (e) => {
        const startY = e.clientY;
        const startH = consoleHeight;
        const onMove = (ev) => { const dy = ev.clientY - startY; const h = Math.max(120, Math.min(480, startH - dy)); setConsoleHeight(h); };
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };


    const [runtimeError, setRuntimeError] = useState(null);
    useEffect(() => {
        const handler = (e) => { try { setRuntimeError(e?.message || 'Runtime error'); } catch {} };
        window.addEventListener('error', handler);
        return () => window.removeEventListener('error', handler);
    }, []);


    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/codexa.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList box">
                        <div className="clientsIcons">
                            {clients.map((client) => (
                                <Client key={client.socketId} username={client.username} compact />
                            ))}
                        </div>
                    </div>
                    {ownerSocketId === socketRef.current?.id && (
                        <div className="clientsList" style={{ marginTop: 12 }}>
                            {clients
                                .filter((c) => c.socketId !== socketRef.current?.id)
                                .map((c) => (
                                    <button
                                        key={c.socketId}
                                        className="btn joinBtn"
                                        style={{ marginTop: 6, width: '100%' }}
                                        onClick={() => removeParticipant(c.socketId)}
                                    >
                                        Remove {c.username}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                <label>
                    Select Language:
                    <select value={lang} onChange={(e) => { setLang(e.target.value); window.location.reload(); }} className="seLang" aria-label="Select language">
                        <option value="clike">C / C++ / C#</option>
                        <option value="css">CSS</option>
                        <option value="dart">Dart</option>
                        <option value="django">Django</option>
                        <option value="dockerfile">Dockerfile</option>
                        <option value="go">Go</option>
                        <option value="htmlmixed">HTML-mixed</option>
                        <option value="javascript">JavaScript</option>
                        <option value="jsx">JSX</option>
                        <option value="markdown">Markdown</option>
                        <option value="php">PHP</option>
                        <option value="python">Python</option>
                        <option value="r">R</option>
                        <option value="rust">Rust</option>
                        <option value="ruby">Ruby</option>
                        <option value="sass">Sass</option>
                        <option value="shell">Shell</option>
                        <option value="sql">SQL</option>
                        <option value="swift">Swift</option>
                        <option value="xml">XML</option>
                        <option value="yaml">yaml</option>
                        <option value="java">Java</option>
                        <option value="typescript">TypeScript</option>
                    </select>
                </label>

                <label>
                    Select Theme:
                    <select value={them} onChange={(e) => { setThem(e.target.value); window.location.reload(); }} className="seLang">
                        <option value="default">default</option>
                        <option value="3024-day">3024-day</option>
                        <option value="3024-night">3024-night</option>
                        <option value="abbott">abbott</option>
                        <option value="abcdef">abcdef</option>
                        <option value="ambiance">ambiance</option>
                        <option value="ayu-dark">ayu-dark</option>
                        <option value="ayu-mirage">ayu-mirage</option>
                        <option value="base16-dark">base16-dark</option>
                        <option value="base16-light">base16-light</option>
                        <option value="bespin">bespin</option>
                        <option value="blackboard">blackboard</option>
                        <option value="cobalt">cobalt</option>
                        <option value="colorforth">colorforth</option>
                        <option value="darcula">darcula</option>
                        <option value="duotone-dark">duotone-dark</option>
                        <option value="duotone-light">duotone-light</option>
                        <option value="eclipse">eclipse</option>
                        <option value="elegant">elegant</option>
                        <option value="erlang-dark">erlang-dark</option>
                        <option value="gruvbox-dark">gruvbox-dark</option>
                        <option value="hopscotch">hopscotch</option>
                        <option value="icecoder">icecoder</option>
                        <option value="idea">idea</option>
                        <option value="isotope">isotope</option>
                        <option value="juejin">juejin</option>
                        <option value="lesser-dark">lesser-dark</option>
                        <option value="liquibyte">liquibyte</option>
                        <option value="lucario">lucario</option>
                        <option value="material">material</option>
                        <option value="material-darker">material-darker</option>
                        <option value="material-palenight">material-palenight</option>
                        <option value="material-ocean">material-ocean</option>
                        <option value="mbo">mbo</option>
                        <option value="mdn-like">mdn-like</option>
                        <option value="midnight">midnight</option>
                        <option value="monokai">monokai</option>
                        <option value="moxer">moxer</option>
                        <option value="neat">neat</option>
                        <option value="neo">neo</option>
                        <option value="night">night</option>
                        <option value="nord">nord</option>
                        <option value="oceanic-next">oceanic-next</option>
                        <option value="panda-syntax">panda-syntax</option>
                        <option value="paraiso-dark">paraiso-dark</option>
                        <option value="paraiso-light">paraiso-light</option>
                        <option value="pastel-on-dark">pastel-on-dark</option>
                        <option value="railscasts">railscasts</option>
                        <option value="rubyblue">rubyblue</option>
                        <option value="seti">seti</option>
                        <option value="shadowfox">shadowfox</option>
                        <option value="solarized">solarized</option>
                        <option value="the-matrix">the-matrix</option>
                        <option value="tomorrow-night-bright">tomorrow-night-bright</option>
                        <option value="tomorrow-night-eighties">tomorrow-night-eighties</option>
                        <option value="ttcn">ttcn</option>
                        <option value="twilight">twilight</option>
                        <option value="vibrant-ink">vibrant-ink</option>
                        <option value="xq-dark">xq-dark</option>
                        <option value="xq-light">xq-light</option>
                        <option value="yeti">yeti</option>
                        <option value="yonce">yonce</option>
                        <option value="zenburn">zenburn</option>
                    </select>
                </label>

                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button><br />
                <button className="btn joinBtn" onClick={shareRoom}>
                    Share Room
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
                {ownerSocketId === socketRef.current?.id && (
                    <button className="btn leaveBtn" onClick={deleteRoom}>
                        Delete Room
                    </button>
                )}
            </div>

            <div className="editorWrap">
                <div className="tabBar">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            className={`tabItem ${t.id === activeTabId ? 'active' : ''}`}
                            onClick={() => switchTab(t.id)}
                            onContextMenu={(e) => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); setTabMenu({ open: true, x: rect.left, y: rect.bottom + 4, tabId: t.id }); }}
                            title={t.title}
                        >
                            {t.title}
                        </button>
                    ))}
                    <button className="addTabBtn" onClick={addTab}>+</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="tabItem" onClick={shareActiveTab} title="Share"><ShareIcon size={16} /></button>
                        <button className="tabItem" onClick={downloadActiveTab} title="Download"><DownloadIcon size={16} /></button>
                        <button className="tabItem" onClick={saveCurrentTab} title="Save"><SaveIcon size={16} /></button>
                        <button className="tabItem" onClick={runCode} disabled={running} title="Run"><PlayIcon size={16} /></button>
                        <button className="tabItem" onClick={() => setSplitEnabled(v=>!v)}>{splitEnabled ? 'Unspli﻿t' : 'Split'}</button>
                        <button className="tabItem" onClick={() => setSplitOrientation(o=> o==='vertical' ? 'horizontal' : 'vertical')}>{splitOrientation==='vertical' ? 'Vertical' : 'Horizontal'}</button>
                        <input type="file" ref={importInputRef} style={{ display:'none' }} accept=".txt,.md,.js,.ts,.py,.java,.cpp,.c,.go,.rs,.json,.html,.css" onChange={(e)=>{ const f=e.target.files?.[0]; if (!f) return; const r=new FileReader(); r.onload=()=>{ const text=String(r.result||''); setTabCodes((prev)=>({ ...prev, [activeTabId]: text })); setExternalCode(text); try { socketRef.current?.emit(ACTIONS.CODE_CHANGE, { roomId, tabId: activeTabId, code: text }); } catch{} }; r.readAsText(f); if (importInputRef.current) importInputRef.current.value=''; }} />
                        <button className="tabItem" onClick={()=>importInputRef.current?.click()} title="Import"><UploadIcon size={16} /></button>
                        <button className="tabItem" onClick={() => setConsoleOpen((v)=>!v)} title={consoleOpen ? 'Hide Console' : 'Show Console'}>{consoleOpen ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}</button>
                    </div>
                </div>
                {tabMenu.open && (
                    <div className="tabMenu" style={{ top: tabMenu.y, left: tabMenu.x }} onMouseLeave={()=> setTabMenu({ open:false, x:0, y:0, tabId:'' })}>
                        <button className="tabMenuItem" onClick={() => { const left = activeTabId; let right = tabMenu.tabId; if (right === left) { const alt = tabs.find(t=> t.id !== left)?.id; if (alt) right = alt; else { const id = `tab-${Date.now()}`; const title = `Tab ${tabs.length + 1}`; setTabs(prev=>[...prev, { id, title, shared: true }]); setTabCodes(prev=>({ ...prev, [id]: '' })); right = id; } } setSplitLeftTabId(left); setSplitRightTabId(right); setSplitEnabled(true); setSplitOrientation('vertical'); setTabMenu({ open:false, x:0, y:0, tabId:'' }); }}>Split Vertical</button>
                        <button className="tabMenuItem" onClick={() => { const left = activeTabId; let right = tabMenu.tabId; if (right === left) { const alt = tabs.find(t=> t.id !== left)?.id; if (alt) right = alt; else { const id = `tab-${Date.now()}`; const title = `Tab ${tabs.length + 1}`; setTabs(prev=>[...prev, { id, title, shared: true }]); setTabCodes(prev=>({ ...prev, [id]: '' })); right = id; } } setSplitLeftTabId(left); setSplitRightTabId(right); setSplitEnabled(true); setSplitOrientation('horizontal'); setTabMenu({ open:false, x:0, y:0, tabId:'' }); }}>Split Horizontal</button>
                        <button className="tabMenuItem" onClick={() => { setSplitEnabled(false); setSplitLeftTabId(null); setSplitRightTabId(null); setTabMenu({ open:false, x:0, y:0, tabId:'' }); }}>Unsplit</button>
                        <button className="tabMenuItem danger" onClick={() => { const id = tabMenu.tabId; setTabMenu({ open:false, x:0, y:0, tabId:'' }); const ok = window.confirm('Delete this tab?'); if (!ok) return; setTabs((prev)=> { const next = prev.filter(t=> t.id !== id); if (!next.length) return prev; if (activeTabId === id) setActiveTabId(next[0].id); if (splitLeftTabId === id) setSplitLeftTabId(next[0].id); if (splitRightTabId === id) setSplitRightTabId(next[1]?.id || next[0].id); return next; }); setTabCodes((prev)=>{ const copy={...prev}; delete copy[id]; return copy; }); }}>Delete Tab</button>
                    </div>
                )}
                <div className="editorSplitWrap" style={{ display: 'grid', gridTemplateColumns: splitEnabled && splitOrientation==='vertical' ? `${splitRatio}% 6px ${100-splitRatio}%` : '1fr', gridTemplateRows: splitEnabled && splitOrientation==='horizontal' ? `${splitRatio}% 6px ${100-splitRatio}%` : '1fr', minHeight:'0', flex: '1 1 auto' }}>
                    {(() => { const leftId = splitEnabled ? (splitLeftTabId || activeTabId) : activeTabId; const rightId = splitEnabled ? (splitRightTabId) : null; return (
                    <div className="paneWrap">
                    <div className="tabCornerLabel">{tabs.find(t=>t.id===leftId)?.title || leftId}</div>
                    <ErrorBoundary>
                    <Suspense fallback={<Skeleton lines={6} />}> 
                    <Editor
                        key={`${leftId}-left`}
                        socketRef={socketRef}
                        roomId={roomId}
                        tabId={leftId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                            setTabCodes((prev) => ({ ...prev, [leftId]: code }));
                        }}
                        onSelectionToChat={(sel) => { setActiveTab('ai'); setAiPresetInput(sel); }}
                        externalCode={tabCodes[leftId] || ''}
                        acceptRemote={acceptRemote}
                    />
                    </Suspense>
                    </ErrorBoundary>
                    </div>
                    ); })()}
                    {splitEnabled && (() => { const leftId = splitLeftTabId || activeTabId; const rightId = splitRightTabId || tabs.find(t=>t.id!==leftId)?.id || leftId; return (
                        <div className="splitDivider" style={{ cursor: splitOrientation==='vertical' ? 'col-resize' : 'row-resize' }} onMouseDown={(e)=>{ const start = splitOrientation==='vertical' ? e.clientX : e.clientY; const onMove=(ev)=>{ const delta=(splitOrientation==='vertical'? ev.clientX - start : start - ev.clientY); const size=(splitOrientation==='vertical'? e.currentTarget.parentElement.getBoundingClientRect().width : e.currentTarget.parentElement.getBoundingClientRect().height); const pct = Math.max(20, Math.min(80, splitRatio + (delta/size)*100)); setSplitRatio(pct); }; const onUp=()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }} />
                    ); })()}
                    {splitEnabled && (() => { const leftId = splitLeftTabId || activeTabId; const rightId = splitRightTabId || tabs.find(t=>t.id!==leftId)?.id || leftId; return (
                    <div className="paneWrap">
                    <div className="tabCornerLabel">{tabs.find(t=>t.id===rightId)?.title || rightId}</div>
                    <ErrorBoundary>
                    <Suspense fallback={<Skeleton lines={6} />}> 
                    <Editor
                        key={`${rightId}-right`}
                        socketRef={socketRef}
                        roomId={roomId}
                        tabId={rightId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                            setTabCodes((prev) => ({ ...prev, [rightId]: code }));
                        }}
                        onSelectionToChat={(sel) => { setActiveTab('ai'); setAiPresetInput(sel); }}
                        externalCode={tabCodes[rightId] || ''}
                        acceptRemote={acceptRemote}
                    />
                    </Suspense>
                    </ErrorBoundary>
                    </div>
                    ); })()}
                </div>
                <div className="statusBar">
                    <div className="statusLeft">
                        <span className="pill">{tabs.find(t=>t.id===activeTabId)?.title || activeTabId}</span>
                        <span className="divider" />
                        <span>Lang: {lang}</span>
                        <span className="divider" />
                        <span>Theme: {them}</span>
                    </div>
                    <div className="statusRight">
                        <span className={`pill ${running?'accent':''}`}>{running ? 'Running' : 'Idle'}</span>
                    </div>
                </div>
                {consoleOpen && (
                    <div className="consolePanel" style={{ height: consoleHeight }}>
                        <div className="consoleHeader">
                            <div className="consoleTabs">
                                <button className={`tabItem ${activeConsoleTab==='input'?'active':''}`} onClick={()=>setActiveConsoleTab('input')}>Input <span className="badge">{(testInput && testInput.split(/\r?\n/).filter(l=>l.length>0).length) || 0}</span></button>
                                <button className={`tabItem ${activeConsoleTab==='output'?'active':''}`} onClick={()=>setActiveConsoleTab('output')}>Output <span className="badge">{consoleLogs.length}</span></button>
                                <button className={`tabItem ${activeConsoleTab==='errors'?'active':''}`} onClick={()=>setActiveConsoleTab('errors')}>Errors <span className="badge danger">{consoleErrors.length}</span></button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems:'center' }}>
                                <label style={{ display:'flex', alignItems:'center', gap:6 }} title="Auto-scroll">
                                    <input type="checkbox" checked={autoScrollConsole} onChange={(e)=>setAutoScrollConsole(e.target.checked)} />
                                    <span style={{ fontSize:12, color:'var(--muted)' }}>Auto-scroll</span>
                                </label>
                                <button className="tabItem" onClick={copyActive} title="Copy"><CopyIcon size={16} /></button>
                                {activeConsoleTab==='input' && (
                                    <button className="tabItem" onClick={clearInput} title="Clear Input"><TrashIcon size={16} /></button>
                                )}
                                <button className="tabItem" onClick={clearConsole} title="Clear"><TrashIcon size={16} /></button>
                                <button className="tabItem" title="Save Session" onClick={async () => { try { await fetch(`${backendURL}/api/room/${roomId}/save`, { method: 'POST' }); toast.success('Session saved'); } catch {} }}><SaveIcon size={16} /></button>
                                <button className="tabItem" title="Load Session" onClick={async () => { try { await fetch(`${backendURL}/api/room/${roomId}/load`, { method: 'POST' }); toast.success('Session loaded'); } catch { toast.error('Load failed'); } }}><DownloadIcon size={16} /></button>
                            </div>
                        </div>
                        <div className="resizer" onMouseDown={onStartResize} />
                        <div className="consoleBody" style={{ gridTemplateColumns: lang==='htmlmixed' ? '1fr 40%' : '1fr' }}>
                            {activeConsoleTab==='input' && (
                                <textarea className="consoleInput" value={testInput} onChange={(e)=>setTestInput(e.target.value)} placeholder="Paste test input here (lines)" />
                            )}
                            {activeConsoleTab==='output' && (
                                <div className="consoleLogs" id="consoleOutput">
                                    {consoleLogs.map((l, i) => (
                                        <div key={i} className={`log ${l.t}`}>{l.m}</div>
                                    ))}
                                </div>
                            )}
                            {activeConsoleTab==='errors' && (
                                <div className="consoleLogs" id="consoleErrors">
                                    {consoleErrors.map((l, i) => (
                                        <div key={i} className={`log ${l.t}`}>{l.m}</div>
                                    ))}
                                </div>
                            )}
                            {lang === 'htmlmixed' && (
                                <iframe ref={iframeRef} title="preview" className="consolePreview" />
                            )}
                        </div>
                    </div>
                )}
                {true && (
                    <div className="testcasesPanel">
                        <div className="testcasesHeader">
                            <div>Testcases</div>
                            <div style={{ display:'flex', gap:8, marginLeft:'auto', alignItems:'center' }}>
                                <button className="tabItem" title="Add" onClick={() => setTestcases(prev => [...prev, { id: `tc-${Date.now()}`, name: `Case ${prev.length+1}`, input: '', expected: '', hidden: false }])}><PlusIcon size={16} /></button>
                                <button className="tabItem" title="Save" onClick={async () => { try { const r = await fetch(`${backendURL}/api/room/${roomId}/testcases/save`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ testcases }) }); const j = await r.json(); if (!r.ok) { toast.error(j?.error||'Save failed'); return; } toast.success('Testcases saved'); } catch { toast.error('Save failed'); } }}><SaveIcon size={16} /></button>
                                <button className="tabItem" title="Load" onClick={async () => { try { const r = await fetch(`${backendURL}/api/room/${roomId}/testcases/load`); const j = await r.json(); if (!r.ok) { toast.error(j?.error||'Load failed'); return; } if (Array.isArray(j.testcases)) setTestcases(j.testcases); toast.success('Testcases loaded'); } catch { toast.error('Load failed'); } }}><DownloadIcon size={16} /></button>
                                <button className="tabItem" title={showHidden ? 'Hide Hidden' : 'Show Hidden'} onClick={()=> setShowHidden(v=>!v)}>{showHidden ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}</button>
                                <button className="tabItem" title="Run All" onClick={async () => {
                                    try {
                                        const code = tabCodes[activeTabId] || '';
                                        const mapLang = (l) => {
                                            if (l === 'javascript' || l === 'jsx') return 'javascript';
                                            if (l === 'python') return 'python';
                                            if (l === 'shell') return 'bash';
                                            if (l === 'dockerfile') return 'bash';
                                            if (l === 'clike') return 'cpp';
                                            if (l === 'go') return 'go';
                                            if (l === 'rust') return 'rust';
                                            if (l === 'java') return 'java';
                                            if (l === 'typescript') return 'typescript';
                                            return l;
                                        };
                                        const serverLang = mapLang(lang);
                                        const useDocker = ['cpp','go','rust','java'].includes(serverLang);
                                        const r = await fetch(`${backendURL}/api/executeTestcases`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ language: serverLang, code, testcases, useDocker }) });
                                        const j = await r.json();
                                        if (!r.ok) { toast.error(j?.error || 'Run all failed'); return; }
                                        const res = j.results || [];
                                        setConsoleOpen(true);
                                        setActiveConsoleTab('output');
                                        setConsoleLogs(prev => [...prev, { t: 'info', m: `Ran ${res.length} testcases` }]);
                                        const merged = testcases.map((tc, idx) => {
                                            const item = res[idx] || {};
                                            return { ...tc, actual: item.actual || '', pass: !!item.pass, diff: item.diff || [] };
                                        });
                                        setTestcases(merged);
                                        merged.forEach((item, idx) => {
                                            const m = item.pass ? `#${idx+1} PASS` : `#${idx+1} FAIL`;
                                            const d = Array.isArray(item.diff) && item.diff.length > 0 ? `\nDiff lines: ${item.diff.map(x=>x.line).join(', ')}` : '';
                                            setConsoleLogs(prev => [...prev, { t: item.pass ? 'log' : 'error', m: `${m}\nExpected: ${item.expected}\nActual: ${item.actual}${d}` }]);
                                        });
                                    } catch { toast.error('Run all failed'); }
                                }}><PlayIcon size={16} /></button>
                            </div>
                        </div>
                        <div className="testcasesBody">
                            {testcases.filter(tc => showHidden || !tc.hidden).map((tc) => (
                                <div key={tc.id} className="tcRow">
                                    <input className="tcName" value={tc.name} onChange={(e)=>setTestcases(prev => prev.map(x => x.id===tc.id ? { ...x, name: e.target.value } : x))} />
                                    <label className="tcHidden"><input type="checkbox" checked={tc.hidden} onChange={(e)=>setTestcases(prev => prev.map(x => x.id===tc.id ? { ...x, hidden: e.target.checked } : x))} />Hidden</label>
                                    <button className="tabItem danger" onClick={()=>setTestcases(prev => prev.filter(x => x.id !== tc.id))}>Delete</button>
                                    <div className="tcCols">
                                        <textarea className="tcInput" value={tc.input} onChange={(e)=>setTestcases(prev => prev.map(x => x.id===tc.id ? { ...x, input: e.target.value } : x))} placeholder="Input" />
                                        <textarea className="tcExpected" value={tc.expected} onChange={(e)=>setTestcases(prev => prev.map(x => x.id===tc.id ? { ...x, expected: e.target.value } : x))} placeholder="Expected Output" />
                                        <textarea className="tcActual" value={tc.actual || ''} placeholder="Actual Output" readOnly />
                                    </div>
                                    {Array.isArray(tc.diff) && tc.diff.length > 0 && (
                                        <div style={{ marginTop: 8, background:'rgba(255,255,255,0.04)', border:'1px dashed var(--border)', borderRadius:8, padding:8 }}>
                                            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Differences</div>
                                            {tc.diff.map((d, i) => (
                                                <div key={i} style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace', fontSize:12 }}>
                                                    <span className="pill">Line {d.line}</span>
                                                    <span style={{ marginLeft:8 }}>Expected: {d.expected}</span>
                                                    <span style={{ marginLeft:8 }}>Actual: {d.actual}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ marginTop: 6 }}>
                                        <span className={`pill ${tc.pass ? 'accent' : ''}`}>{tc.pass ? 'PASS' : 'FAIL'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="rightAside">
                <div className="rightTabs">
                    <button className={`tabBtn ${activeTab==='chat'?'active':''}`} onClick={() => setActiveTab('chat')}>Room Chat</button>
                    <button className={`tabBtn ${activeTab==='ai'?'active':''}`} onClick={() => setActiveTab('ai')}>AI Assistant</button>
                    <button className={`tabBtn ${activeTab==='leetcode'?'active':''}`} onClick={() => setActiveTab('leetcode')}>LeetCode</button>
                </div>

                {activeTab === 'chat' && (
                    <>
                        <div className="messages" ref={messagesRef}>
                            {messages.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={`message ${m.username === username ? 'own' : ''}`}
                                >
                                    <div className="messageMeta">
                                        <span className="messageUser">{m.username}</span>
                                        <span className="messageTime">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="messageText">{m.message}</div>
                                </div>
                            ))}
                        </div>
                        <div className="messageInputRow">
                            <input
                                type="text"
                                className="chatInput"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                            />
                            <button className="btn sendBtn" onClick={sendMessage}>Send</button>
                        </div>
                    </>
                )}

                {activeTab === 'ai' && (
                    <ErrorBoundary>
                    <Suspense fallback={<Skeleton lines={6} />}>
                    <AIChat
                        username={username}
                        preset={aiPresetInput}
                        onApply={(mode, text) => applyAiToEditor(text, mode)}
                        roomId={roomId}
                        socketRef={socketRef}
                    />
                    </Suspense>
                    </ErrorBoundary>
                )}

                {activeTab === 'leetcode' && (
                    <div className="aiChatRoot" style={{ padding: 12 }}>
                        <LeetCodePanel roomId={roomId} backendURL={backendURL} lang={lang} onLoad={(code, tcs) => { const next = code || ''; setTabCodes(prev=>({ ...prev, [activeTabId]: next })); setExternalCode(next); try { socketRef.current?.emit(ACTIONS.CODE_CHANGE, { roomId, tabId: activeTabId, code: next }); } catch{} if (Array.isArray(tcs)) { setTestcases(tcs); try { fetch(`${backendURL}/api/room/${roomId}/testcases/save`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ testcases: tcs }) }); } catch {} } }} />
                    </div>
                )}
            </div>
            {runtimeError && (
                <div className="overlayError">
                    <div className="overlayBox">
                        <div className="overlayTitle">Runtime Error</div>
                        <div className="overlayMessage">{runtimeError}</div>
                        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
                            <button className="tabItem" onClick={()=>setRuntimeError(null)}>Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EditorPage;
