require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { fetch } = require('undici');
const multer = require('multer');
const pdf = require('pdf-parse');

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET', 'POST'], credentials: true } });
const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',
    CHAT_MESSAGE: 'chat-message',
    DELETE_ROOM: 'delete-room',
    ROOM_DELETED: 'room-deleted',
    REMOVE_PARTICIPANT: 'remove-participant',
    KICKED: 'kicked',
    AI_THREAD_UPDATE: 'ai-thread-update',
    TABS_UPDATE: 'tabs-update',
    TAB_CREATE: 'tab-create',
};

const userSocketMap = {};
const roomOwners = {};
const roomCodes = {};
const roomTabs = {};
const roomAI = {};     // roomId -> [{ role, content, ts }]

// --- LeetCode dataset (curated sample) ---
// --- Built-in sample problems (fallback when external API unavailable) ---
const leetcodeProblems = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Print as [i,j].',
    templates: {
      javascript:
        "const arrLine = readLine();\nconst targetLine = readLine();\nconst nums = arrLine.split(/\\s+/).map(Number);\nconst target = Number(targetLine);\nconst map = new Map();\nfor (let i = 0; i < nums.length; i++) {\n  const need = target - nums[i];\n  if (map.has(need)) { console.log(`[${map.get(need)},${i}]`); return; }\n  map.set(nums[i], i);\n}\nconsole.log('[]');",
      python:
        "arr_line = input().strip()\ntry:\n    target_line = input().strip()\nexcept Exception:\n    target_line = '0'\nnums = list(map(int, arr_line.split()))\ntarget = int(target_line)\nseen = {}\nfor i, x in enumerate(nums):\n    need = target - x\n    if need in seen:\n        print(f'[{seen[need]},{i}]')\n        break\n    seen[x] = i\nelse:\n    print('[]')"
    },
    testcases: [
      { id: 'tc-1', name: 'Basic', input: '2 7 11 15\n9', expected: '[0,1]', hidden: false },
      { id: 'tc-2', name: 'No Pair', input: '1 2 3\n7', expected: '[]', hidden: false },
    ],
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    tags: ['String'],
    description: 'Reverse the input string and print it.',
    templates: {
      javascript: "const s = readLine(); console.log((s||'').split('').reverse().join(''));",
      python: "s = input().strip()\nprint(''.join(reversed(s)))",
    },
    testcases: [
      { id: 'tc-1', name: 'hello', input: 'hello', expected: 'olleh', hidden: false },
      { id: 'tc-2', name: 'abcd', input: 'abcd', expected: 'dcba', hidden: false },
    ],
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    tags: ['Stack'],
    description: 'Given a string containing just the characters (){}[], determine if the input string is valid.',
    templates: {
      javascript:
        "const s = readLine();\nconst pairs = {')':'(',']':'[','}':'{'};\nconst st=[];\nfor (const ch of (s||'')) {\n  if (ch==='('||ch==='['||ch==='{') st.push(ch);\n  else if (ch in pairs) { if (st.pop() !== pairs[ch]) { console.log('false'); return; } }\n}\nconsole.log(st.length===0?'true':'false');",
      python:
        "s = input().strip()\npairs = {')':'(',']':'[','}':'{'}\nst = []\nfor ch in s:\n    if ch in '([{':\n        st.append(ch)\n    elif ch in pairs:\n        if not st or st.pop() != pairs[ch]:\n            print('false');\n            break\nelse:\n    print('true' if not st else 'false')",
    },
    testcases: [
      { id: 'tc-1', name: 'valid', input: '()[]{}', expected: 'true', hidden: false },
      { id: 'tc-2', name: 'invalid', input: '(]', expected: 'false', hidden: false },
    ],
  },
  {
    id: 'fizz-buzz',
    title: 'Fizz Buzz',
    difficulty: 'Easy',
    tags: ['Math'],
    description: 'Given integer n, print numbers 1..n with Fizz/Buzz/FizzBuzz rules, one per line.',
    templates: {
      javascript:
        "const n = Number(readLine()||'0');\nfor (let i=1;i<=n;i++){ const f=i%3===0, b=i%5===0; console.log(f&&b?'FizzBuzz':f?'Fizz':b?'Buzz':String(i)); }",
      python:
        "n = int(input().strip() or '0')\nfor i in range(1, n+1):\n    f = (i % 3 == 0)\n    b = (i % 5 == 0)\n    print('FizzBuzz' if f and b else ('Fizz' if f else ('Buzz' if b else str(i))))",
    },
    testcases: [
      { id: 'tc-1', name: '5', input: '5', expected: '1\n2\nFizz\n4\nBuzz', hidden: false },
    ],
  },
];

// External LeetCode API cache
let lcCache = { list: null, ts: 0 };
const LC_TTL_MS = 5 * 60 * 1000;

async function getExternalProblems() {
  try {
    const now = Date.now();
    if (lcCache.list && (now - lcCache.ts < LC_TTL_MS)) return lcCache.list;
    const r = await fetch('https://leetcode-api-pied.vercel.app/problems');
    const j = await r.json();
    const list = Array.isArray(j) ? j : (Array.isArray(j.problems) ? j.problems : (Array.isArray(j.data) ? j.data : null));
    if (!Array.isArray(list)) throw new Error('Invalid external format');
    lcCache = { list, ts: now };
    return list;
  } catch (e) {
    return null;
  }
}
const roomVectorStores = {}; // roomId -> MemoryVectorStore

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        if (!roomOwners[roomId]) {
            roomOwners[roomId] = socket.id;
        }
        if (!roomTabs[roomId]) {
            roomTabs[roomId] = [{ id: 'tab-1', title: 'Tab 1' }];
        }
        if (!roomCodes[roomId]) {
            roomCodes[roomId] = { 'tab-1': '' };
        }
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
                roomOwner: roomOwners[roomId],
            });
        });
        io.to(socket.id).emit(ACTIONS.TABS_UPDATE, { tabs: roomTabs[roomId] });
        const firstTab = roomTabs[roomId][0]?.id || 'tab-1';
        const initial = roomCodes[roomId]?.[firstTab] ?? '';
        io.to(socket.id).emit(ACTIONS.CODE_CHANGE, { tabId: firstTab, code: initial });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, tabId, code }) => {
        const tabs = roomTabs[roomId] || [{ id: 'tab-1', title: 'Tab 1' }];
        const tid = tabId || tabs[0].id;
        if (!roomCodes[roomId]) roomCodes[roomId] = {};
        roomCodes[roomId][tid] = code;
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { tabId: tid, code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, roomId, tabId }) => {
        const tabs = roomTabs[roomId] || [{ id: 'tab-1', title: 'Tab 1' }];
        const tid = tabId || tabs[0].id;
        const resolved = code ?? (roomCodes[roomId]?.[tid] ?? '');
        const payload = { tabId: tid, code: resolved };
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, payload);
    });

    socket.on(ACTIONS.TAB_CREATE, ({ roomId, tab }) => {
        if (!tab || !tab.id) return;
        if (!roomTabs[roomId]) roomTabs[roomId] = [];
        if (!roomCodes[roomId]) roomCodes[roomId] = {};
        const exists = roomTabs[roomId].some((t) => t.id === tab.id);
        if (!exists) roomTabs[roomId].push({ id: tab.id, title: tab.title || tab.id });
        if (!(tab.id in roomCodes[roomId])) roomCodes[roomId][tab.id] = '';
        io.to(roomId).emit(ACTIONS.TABS_UPDATE, { tabs: roomTabs[roomId] });
    });

    socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message, username, timestamp }) => {
        io.to(roomId).emit(ACTIONS.CHAT_MESSAGE, { message, username, timestamp });
    });

    socket.on(ACTIONS.REMOVE_PARTICIPANT, ({ roomId, targetSocketId }) => {
        if (roomOwners[roomId] !== socket.id) return;
        const target = io.sockets.sockets.get(targetSocketId);
        if (!target) return;
        io.to(targetSocketId).emit(ACTIONS.KICKED, { roomId });
        target.leave(roomId);
    });

    socket.on(ACTIONS.DELETE_ROOM, ({ roomId }) => {
        if (roomOwners[roomId] !== socket.id) return;
        io.to(roomId).emit(ACTIONS.ROOM_DELETED, { roomId });
        const roomSet = io.sockets.adapter.rooms.get(roomId) || new Set();
        for (const sockId of roomSet) {
            const s = io.sockets.sockets.get(sockId);
            s && s.leave(roomId);
        }
        delete roomOwners[roomId];
        delete roomCodes[roomId];
        delete roomTabs[roomId];
        delete roomAI[roomId];
        delete roomVectorStores[roomId];
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
            if (roomOwners[roomId] === socket.id) {
                const clients = getAllConnectedClients(roomId).filter(c => c.socketId !== socket.id);
                if (clients.length > 0) {
                    roomOwners[roomId] = clients[0].socketId;
                } else {
                    delete roomOwners[roomId];
                    delete roomCodes[roomId];
                    delete roomTabs[roomId];
                    delete roomAI[roomId];
                    delete roomVectorStores[roomId];
                }
            }
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Setup Multer
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { roomId } = req.body;
        if (!req.file || !roomId) return res.status(400).json({ error: 'File and roomId required' });

        let text = '';
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            text = data.text;
        } else {
            text = req.file.buffer.toString('utf-8');
        }

        const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter');
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const docs = await splitter.createDocuments([text], [{ source: req.file.originalname }]);

        // Initialize vector store if not exists
        if (!roomVectorStores[roomId]) {
            const { MemoryVectorStore } = await import('@langchain/community/vectorstores/memory');
            const { OpenAIEmbeddings } = await import('@langchain/openai');
            const embeddings = new OpenAIEmbeddings({
                apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
            });
            roomVectorStores[roomId] = new MemoryVectorStore(embeddings);
        }

        await roomVectorStores[roomId].addDocuments(docs);
        res.json({ message: 'File processed and added to context' });
    } catch (e) {
        console.error('Upload processing error:', e);
        res.status(500).json({ error: 'Processing failed' });
    }
});

app.post('/api/ai', async (req, res) => {
    try {
        const base = process.env.AI_BASE_URL;
        const key = process.env.AI_API_KEY;
        const { prompt, model } = req.body || {};
        if (!base || !prompt) {
            return res.status(400).json({ error: 'Missing AI_BASE_URL or prompt' });
        }
        const headers = { 'Content-Type': 'application/json' };
        if (key) headers['Authorization'] = `Bearer ${key}`;
        const body = JSON.stringify(model ? { prompt, model } : { prompt });
        const r = await fetch(base, { method: 'POST', headers, body });
        const ct = r.headers.get('content-type') || '';
        let text;
        if (ct.includes('application/json')) {
            const data = await r.json();
            text = data?.text || data?.output || data?.result || data?.choices?.[0]?.message?.content || JSON.stringify(data);
            return res.json({ text });
        } else {
            text = await r.text();
            return res.json({ text });
        }
    } catch (e) {
        return res.status(500).json({ error: 'AI proxy error' });
    }
});

app.post('/api/ai/openrouter', async (req, res) => {
    try {
        const key = process.env.OPENROUTER_API_KEY;
        const site = process.env.OPENROUTER_SITE_URL || '';
        const title = process.env.OPENROUTER_SITE_NAME || '';
        const defaultModel = process.env.OPENROUTER_MODEL || 'kwaipilot/kat-coder-pro:free';
        const { messages, roomId, model, temperature, systemPrompt, enableRAG, topK, includeCode } = req.body || {};
        if (!key || !messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing OPENROUTER_API_KEY or messages' });
        }

        const msgs = messages.map(m => ({ role: m.role, content: m.content }));
        if (systemPrompt) msgs.unshift({ role: 'system', content: systemPrompt });

        const sources = [];
        const useRag = enableRAG !== false;
        let context = '';
        if (useRag && roomId && roomVectorStores[roomId]) {
            try {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.role === 'user') {
                    const k = Math.max(1, Math.min(10, Number(topK) || 3));
                    const results = await roomVectorStores[roomId].similaritySearch(lastMsg.content, k);
                    context = results.map(d => d.pageContent).join('\n\n');
                    for (const d of results) {
                        sources.push({ snippet: d.pageContent, source: d.metadata?.source || null });
                    }
                    if (context) {
                        msgs[msgs.length - 1].content = `Context:\n${context}\n\nQuestion: ${lastMsg.content}`;
                    }
                }
            } catch (err) {}
        }

        if (includeCode && roomId && roomCodes[roomId]) {
            try {
                const codeParts = [];
                const tabs = roomTabs[roomId] || [];
                for (const t of tabs) {
                    const c = roomCodes[roomId]?.[t.id] || '';
                    if (c && c.trim()) codeParts.push(`Tab ${t.title || t.id}:\n${c}`);
                }
                if (codeParts.length > 0) {
                    const codeContext = codeParts.join('\n\n');
                    const trimmed = codeContext.length > 8000 ? codeContext.slice(0, 8000) : codeContext;
                    msgs.push({ role: 'system', content: `Project code context (truncated):\n${trimmed}` });
                }
            } catch {}
        }

        const headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };
        if (site) headers['HTTP-Referer'] = site;
        if (title) headers['X-Title'] = title;
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({ model: model || defaultModel, messages: msgs, temperature: typeof temperature === 'number' ? temperature : undefined })
        });
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) {
            const err = ct.includes('application/json') ? await r.json() : { error: await r.text() };
            return res.status(r.status).json(err);
        }
        const data = ct.includes('application/json') ? await r.json() : { text: await r.text() };
        const text = data?.choices?.[0]?.message?.content || data?.text || data?.error || JSON.stringify(data);
        return res.json({ text, sources });
    } catch (e) {
        return res.status(500).json({ error: 'OpenRouter proxy error' });
    }
});

app.get('/api/room/:roomId/ai', (req, res) => {
    const { roomId } = req.params;
    const thread = roomAI[roomId] || [];
    res.json({ messages: thread });
});

app.post('/api/room/:roomId/ai', (req, res) => {
    const { roomId } = req.params;
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });
    const prev = roomAI[roomId] || [];
    const next = [...prev, ...messages];
    roomAI[roomId] = next;
    io.to(roomId).emit(ACTIONS.AI_THREAD_UPDATE, { messages });
    res.json({ ok: true });
});

app.post('/api/room/:roomId/ai/clear', (req, res) => {
    const { roomId } = req.params;
    roomAI[roomId] = [];
    res.json({ ok: true });
});

// --- Project sessions: save/load ---
app.post('/api/room/:roomId/save', async (req, res) => {
    try {
        const { roomId } = req.params;
        const sessionDir = path.join(PROJECT_ROOT, '.sessions');
        await fsp.mkdir(sessionDir, { recursive: true });
        const snapshot = {
            tabs: roomTabs[roomId] || [],
            codes: roomCodes[roomId] || {},
            ai: roomAI[roomId] || [],
            ts: Date.now()
        };
        const file = path.join(sessionDir, `${roomId}.json`);
        await fsp.writeFile(file, JSON.stringify(snapshot, null, 2), 'utf8');
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Save failed' });
    }
});

app.post('/api/room/:roomId/load', async (req, res) => {
    try {
        const { roomId } = req.params;
        const sessionDir = path.join(PROJECT_ROOT, '.sessions');
        const file = path.join(sessionDir, `${roomId}.json`);
        const content = await fsp.readFile(file, 'utf8');
        const data = JSON.parse(content);
        roomTabs[roomId] = Array.isArray(data.tabs) ? data.tabs : [];
        roomCodes[roomId] = typeof data.codes === 'object' && data.codes ? data.codes : {};
        roomAI[roomId] = Array.isArray(data.ai) ? data.ai : [];
        io.to(roomId).emit(ACTIONS.TABS_UPDATE, { tabs: roomTabs[roomId] });
        const firstTab = roomTabs[roomId][0]?.id;
        if (firstTab) io.to(roomId).emit(ACTIONS.CODE_CHANGE, { tabId: firstTab, code: roomCodes[roomId][firstTab] || '' });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Load failed' });
    }
});

app.post('/api/room/:roomId/testcases/save', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { testcases } = req.body || {};
        if (!Array.isArray(testcases)) return res.status(400).json({ error: 'testcases required' });
        const sessionDir = path.join(PROJECT_ROOT, '.sessions');
        await fsp.mkdir(sessionDir, { recursive: true });
        const file = path.join(sessionDir, `testcases_${roomId}.json`);
        await fsp.writeFile(file, JSON.stringify({ testcases, ts: Date.now() }, null, 2), 'utf8');
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Save failed' });
    }
});

app.get('/api/room/:roomId/testcases/load', async (req, res) => {
    try {
        const { roomId } = req.params;
        const sessionDir = path.join(PROJECT_ROOT, '.sessions');
        const file = path.join(sessionDir, `testcases_${roomId}.json`);
        const content = await fsp.readFile(file, 'utf8');
        const data = JSON.parse(content);
        const list = Array.isArray(data.testcases) ? data.testcases : [];
        res.json({ ok: true, testcases: list });
    } catch (e) {
        res.status(404).json({ error: 'No saved testcases' });
    }
});

// ----- Project APIs (Cursor/Lovable style) -----
const PROJECT_ROOT = process.cwd();
function isInsideProject(p) {
    try {
        const rp = path.resolve(PROJECT_ROOT, p);
        return rp.startsWith(PROJECT_ROOT);
    } catch { return false; }
}

app.get('/api/project/files', async (req, res) => {
    try {
        const { dir = 'src', ext } = req.query || {};
        const target = path.resolve(PROJECT_ROOT, dir);
        if (!isInsideProject(dir)) return res.status(400).json({ error: 'Invalid path' });
        const results = [];
        async function walk(p) {
            const entries = await fsp.readdir(p, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(p, e.name);
                if (e.isDirectory()) await walk(full);
                else {
                    if (!ext || full.endsWith(ext)) results.push(path.relative(PROJECT_ROOT, full));
                }
            }
        }
        await walk(target);
        res.json({ files: results });
    } catch (e) { res.status(500).json({ error: 'List failed' }); }
});

app.post('/api/project/read', async (req, res) => {
    try {
        const { file } = req.body || {};
        if (!file || !isInsideProject(file)) return res.status(400).json({ error: 'Invalid file' });
        const full = path.resolve(PROJECT_ROOT, file);
        const stat = await fsp.stat(full);
        if (stat.size > 2_000_000) return res.status(413).json({ error: 'File too large' });
        const content = await fsp.readFile(full, 'utf8');
        res.json({ file, content });
    } catch (e) { res.status(500).json({ error: 'Read failed' }); }
});

app.post('/api/project/search', async (req, res) => {
    try {
        const { q, dir = 'src', caseInsensitive = true } = req.body || {};
        if (!q) return res.status(400).json({ error: 'Query required' });
        if (!isInsideProject(dir)) return res.status(400).json({ error: 'Invalid path' });
        const results = [];
        async function walk(p) {
            const entries = await fsp.readdir(p, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(p, e.name);
                if (e.isDirectory()) await walk(full);
                else {
                    try {
                        const content = await fsp.readFile(full, 'utf8');
                        const hay = caseInsensitive ? content.toLowerCase() : content;
                        const needle = caseInsensitive ? q.toLowerCase() : q;
                        if (hay.includes(needle)) {
                            results.push({ file: path.relative(PROJECT_ROOT, full) });
                        }
                    } catch {}
                }
            }
        }
        await walk(path.resolve(PROJECT_ROOT, dir));
        res.json({ matches: results });
    } catch (e) { res.status(500).json({ error: 'Search failed' }); }
});

app.post('/api/project/write', async (req, res) => {
    try {
        const { file, content, dryRun = true } = req.body || {};
        if (!file || typeof content !== 'string') return res.status(400).json({ error: 'file and content required' });
        if (!isInsideProject(file)) return res.status(400).json({ error: 'Invalid path' });
        const full = path.resolve(PROJECT_ROOT, file);
        if (dryRun) {
            return res.json({ ok: true, dryRun: true, size: Buffer.byteLength(content, 'utf8') });
        }
        await fsp.mkdir(path.dirname(full), { recursive: true });
        await fsp.writeFile(full, content, 'utf8');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Write failed' }); }
});

// AI code planning/diff endpoints (non-destructive)
app.post('/api/project/ai/plan', async (req, res) => {
    try {
        const key = process.env.OPENROUTER_API_KEY;
        const model = process.env.OPENROUTER_MODEL || 'kwaipilot/kat-coder-pro:free';
        const { instruction } = req.body || {};
        if (!key || !instruction) return res.status(400).json({ error: 'Missing key or instruction' });
        const messages = [
            { role: 'system', content: 'You are a senior software engineer. Output concise step plan with bullets.' },
            { role: 'user', content: instruction }
        ];
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages })
        });
        const j = await r.json();
        const text = j?.choices?.[0]?.message?.content || 'No plan';
        res.json({ plan: text });
    } catch (e) { res.status(500).json({ error: 'Plan failed' }); }
});

app.post('/api/project/ai/diff', async (req, res) => {
    try {
        const key = process.env.OPENROUTER_API_KEY;
        const model = process.env.OPENROUTER_MODEL || 'kwaipilot/kat-coder-pro:free';
        const { instruction, files = [] } = req.body || {};
        if (!key || !instruction) return res.status(400).json({ error: 'Missing key or instruction' });
        const inputs = [];
        for (const f of files) {
            if (!isInsideProject(f)) continue;
            try {
                const content = await fsp.readFile(path.resolve(PROJECT_ROOT, f), 'utf8');
                inputs.push({ file: f, content });
            } catch {}
        }
        const messages = [
            { role: 'system', content: 'Return a unified diff only (*** Begin Patch format), minimal changes.' },
            { role: 'user', content: `Instruction: ${instruction}\nFiles:\n${inputs.map(i=>`- ${i.file}`).join('\n')}` },
            { role: 'user', content: inputs.map(i=>`FILE ${i.file}\n${i.content}`).join('\n\n') }
        ];
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages })
        });
        const j = await r.json();
        const text = j?.choices?.[0]?.message?.content || 'No diff';
        res.json({ diff: text });
    } catch (e) { res.status(500).json({ error: 'Diff failed' }); }
});

// ----- Simple backend runner -----
function whereExe(cmd) {
    try {
        const p = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: ['ignore', 'pipe', 'pipe'] });
        return new Promise((resolve) => {
            let out = '';
            p.stdout.on('data', (d) => out += d.toString());
            p.on('close', (code) => resolve(code === 0 && out.trim().split(/\r?\n/)[0]));
        });
    } catch { return Promise.resolve(false); }
}

async function dockerAvailable() {
    return !!(await whereExe('docker'));
}

async function dockerRun(language, code, stdin) {
    const ok = await dockerAvailable(); if (!ok) throw new Error('docker not available');
    const tmpDir = path.join(os.tmpdir(), 'codexa-docker'); await fsp.mkdir(tmpDir, { recursive: true });
    let file = '', image = '', runArgs = [];
    if (language === 'python') {
        file = path.join(tmpDir, `main_${crypto.randomUUID()}.py`);
        await fsp.writeFile(file, code, 'utf8');
        image = 'python:3.11'; runArgs = ['python', path.posix.join('/workspace', path.basename(file))];
    } else if (language === 'javascript' || language === 'jsx') {
        file = path.join(tmpDir, `main_${crypto.randomUUID()}.js`);
        const wrapper = `const fs=require('fs'); const input=fs.readFileSync(0,'utf8'); global.readLine=(function(){ const lines=String(input).split(/\\r?\\n/); let i=0; return ()=> i<lines.length?lines[i++]:''; })();\n${code}`;
        await fsp.writeFile(file, wrapper, 'utf8');
        image = 'node:20'; runArgs = ['node', path.posix.join('/workspace', path.basename(file))];
    } else if (language === 'bash') {
        file = path.join(tmpDir, `script_${crypto.randomUUID()}.sh`);
        await fsp.writeFile(file, code, 'utf8');
        image = 'ubuntu:24.04'; runArgs = ['bash', path.posix.join('/workspace', path.basename(file))];
    } else if (language === 'c') {
        const cfile = path.join(tmpDir, `main_${crypto.randomUUID()}.c`);
        await fsp.writeFile(cfile, code, 'utf8');
        image = 'gcc:latest'; runArgs = ['bash', '-lc', `gcc ${path.posix.join('/workspace', path.basename(cfile))} -O2 -o /workspace/a.out && /workspace/a.out`];
    } else if (language === 'cpp' || language === 'c++') {
        const cppfile = path.join(tmpDir, `main_${crypto.randomUUID()}.cpp`);
        await fsp.writeFile(cppfile, code, 'utf8');
        image = 'gcc:latest'; runArgs = ['bash', '-lc', `g++ ${path.posix.join('/workspace', path.basename(cppfile))} -O2 -std=c++17 -o /workspace/a.out && /workspace/a.out`];
    } else if (language === 'go') {
        const gofile = path.join(tmpDir, `main_${crypto.randomUUID()}.go`);
        await fsp.writeFile(gofile, code, 'utf8');
        image = 'golang:1.22'; runArgs = ['bash', '-lc', `go build -o /workspace/a.out ${path.posix.join('/workspace', path.basename(gofile))} && /workspace/a.out`];
    } else if (language === 'rust') {
        const rsfile = path.join(tmpDir, `main_${crypto.randomUUID()}.rs`);
        await fsp.writeFile(rsfile, code, 'utf8');
        image = 'rust:1.73'; runArgs = ['bash', '-lc', `rustc -O ${path.posix.join('/workspace', path.basename(rsfile))} -o /workspace/a.out && /workspace/a.out`];
    } else if (language === 'java') {
        const jfile = path.join(tmpDir, `Main_${crypto.randomUUID()}.java`);
        await fsp.writeFile(jfile, code, 'utf8');
        image = 'openjdk:21'; runArgs = ['bash', '-lc', `cd /workspace && javac ${path.basename(jfile)} && java ${path.basename(jfile).replace(/\.java$/, '')}`];
    } else {
        throw new Error(`language ${language} not supported`);
    }
    const vol = `${tmpDir}:/workspace`;
    const args = ['run', '--rm', '-m', '512m', '--cpus', '1', '-v', vol, '-w', '/workspace', image, ...runArgs];
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', exitCode = 0;
    const timeoutMs = 10000;
    let killed = false;
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); killed = true; } catch {} }, timeoutMs);
    child.stdin.write(stdin || ''); child.stdin.end();
    child.stdout.on('data', (d) => stdout += d.toString());
    child.stderr.on('data', (d) => stderr += d.toString());
    await new Promise((resolve) => child.on('close', (c) => { clearTimeout(timer); exitCode = c; resolve(); }));
    if (killed) stderr += `\nKilled after ${timeoutMs}ms`;
    return { stdout, stderr, exitCode };
}

app.get('/api/run/availability', async (req, res) => {
    const langs = {
        node: await whereExe('node'),
        python: await whereExe('python'),
        bash: await whereExe(process.platform === 'win32' ? 'bash' : 'bash'),
        gcc: await whereExe('gcc'),
        javac: await whereExe('javac'),
    };
    res.json({ langs });
});

// --- LeetCode endpoints ---
app.get('/api/leetcode/problems', async (req, res) => {
  try {
    const ext = await getExternalProblems();
    if (ext) {
      const mapped = ext.map((p) => ({
        id: p?.slug || p?.title?.toLowerCase().replace(/\s+/g, '-') || p?.frontendQuestionId || p?.questionFrontendId || String(p?.id || ''),
        title: p?.title || p?.name || 'Untitled',
        difficulty: p?.difficulty || 'Unknown',
        tags: Array.isArray(p?.topicTags) ? p.topicTags.map(t=>t.name || t.slug || String(t)) : (Array.isArray(p?.tags) ? p.tags : []),
      }));
      return res.json({ ok: true, problems: mapped, source: 'external' });
    }
    const list = leetcodeProblems.map(p => ({ id: p.id, title: p.title, difficulty: p.difficulty, tags: p.tags }));
    res.json({ ok: true, problems: list, source: 'local' });
  } catch (e) { res.status(500).json({ error: 'Failed to list problems' }); }
});

app.get('/api/leetcode/problem/:id', async (req, res) => {
  try {
    const { id } = req.params;
    async function fetchExternalBySlugOrId(slugOrId) {
      try {
        const r = await fetch(`https://leetcode-api-pied.vercel.app/problem/${slugOrId}`);
        if (!r.ok) throw new Error('ext problem failed');
        const j = await r.json();
        const prob = j?.problem || j;
        if (!prob) throw new Error('no problem');
        return {
          id: prob.slug || slugOrId,
          title: prob.title || prob.name || 'Untitled',
          difficulty: prob.difficulty || 'Unknown',
          tags: Array.isArray(prob.topicTags) ? prob.topicTags.map(t=>t.name||t.slug||String(t)) : (Array.isArray(prob.tags)?prob.tags:[]),
          description: prob.content || prob.desc || 'No description',
        };
      } catch { return null; }
    }
    async function fetchGraphQLBySlug(slug) {
      try {
        const body = JSON.stringify({
          query: "query questionContent($titleSlug: String!) { question(titleSlug: $titleSlug) { title content difficulty topicTags { name slug } } }",
          variables: { titleSlug: slug }
        });
        const headers = {
          'Content-Type': 'application/json',
          'Referer': `https://leetcode.com/problems/${slug}/`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        const r = await fetch('https://leetcode.com/graphql', { method: 'POST', headers, body });
        if (!r.ok) throw new Error('graphql failed');
        const j = await r.json();
        const q = j?.data?.question;
        if (!q) throw new Error('no question');
        return {
          id: slug,
          title: q.title || slug,
          difficulty: q.difficulty || 'Unknown',
          tags: Array.isArray(q.topicTags) ? q.topicTags.map(t=>t.name||t.slug||'') : [],
          description: q.content || 'No description',
        };
      } catch { return null; }
    }

    // Resolve slug if numeric id given
    let slug = id;
    const extList = await getExternalProblems();
    if (extList && (/^\d+$/.test(id) || !id.includes('-'))) {
      const m = extList.find((p) => String(p?.frontendQuestionId||p?.questionFrontendId||p?.id||'') === id);
      if (m?.slug) slug = m.slug;
    }

    // Try external single problem endpoint first
    let problem = await fetchExternalBySlugOrId(slug);
    // If no content, try GraphQL by slug
    if (!problem || !problem.description || problem.description === 'No description') {
      const g = await fetchGraphQLBySlug(slug);
      if (g) problem = g;
    }
    // Fallback to local curated sample
    if (!problem) {
      const p = leetcodeProblems.find(x => x.id === id || x.id === slug);
      if (!p) return res.status(404).json({ error: 'Problem not found' });
      problem = { id: p.id, title: p.title, difficulty: p.difficulty, tags: p.tags, description: p.description };
    }
    return res.json({ ok: true, problem });
  } catch (e) { res.status(500).json({ error: 'Failed to get problem' }); }
});

app.post('/api/room/:roomId/leetcode/load', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id, language } = req.body || {};
    const lang = (String(language||'').toLowerCase());
    const local = leetcodeProblems.find(x => x.id === id);
    const ext = await getExternalProblems();
    let problem = null, template = '';
    if (local) {
      problem = local;
      template = local.templates[lang] || local.templates.javascript || '';
    } else if (ext) {
      const byId = ext.find((p) => (p?.slug === id) || (String(p?.frontendQuestionId||p?.questionFrontendId||p?.id||'') === id) || (p?.title && p.title.toLowerCase().replace(/\s+/g,'-') === id));
      if (byId) {
        problem = {
          id: byId.slug || id,
          title: byId.title || byId.name || 'Untitled',
          difficulty: byId.difficulty || 'Unknown',
          tags: Array.isArray(byId.topicTags) ? byId.topicTags.map(t=>t.name||t.slug||String(t)) : (Array.isArray(byId.tags)?byId.tags:[]),
          description: byId?.content || byId?.desc || 'No description',
          templates: {},
          testcases: [],
        };
        template = (lang==='python') ? "s = input().strip()\nprint(s)  # TODO" : "const s = readLine();\nconsole.log(s); // TODO";
      }
    }
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    if (!roomTabs[roomId]) roomTabs[roomId] = [{ id: 'tab-1', title: 'Tab 1' }];
    if (!roomCodes[roomId]) roomCodes[roomId] = { 'tab-1': '' };
    const firstTab = roomTabs[roomId][0]?.id || 'tab-1';
    roomCodes[roomId][firstTab] = template;
    io.to(roomId).emit(ACTIONS.CODE_CHANGE, { tabId: firstTab, code: template });
    const sessionDir = path.join(PROJECT_ROOT, '.sessions');
    await fsp.mkdir(sessionDir, { recursive: true });
    const file = path.join(sessionDir, `testcases_${roomId}.json`);
    const tcs = Array.isArray(problem.testcases) ? problem.testcases : [];
    await fsp.writeFile(file, JSON.stringify({ testcases: tcs, ts: Date.now(), problemId: problem.id }, null, 2), 'utf8');
    res.json({ ok: true, problem: { id: problem.id, title: problem.title, difficulty: problem.difficulty, tags: problem.tags, description: problem.description }, code: template, testcases: tcs });
  } catch (e) { res.status(500).json({ error: 'Failed to load problem' }); }
});

app.post('/api/run', async (req, res) => {
    try {
        const { language, code, stdin = '', useDocker = false } = req.body || {};
        if (!language || typeof code !== 'string') return res.status(400).json({ error: 'language and code required' });
        const start = Date.now();
        let stdout = '', stderr = '', exitCode = 0;
        const timeoutMs = 8000;
        let child;
        function withTimeout(proc) {
            return new Promise((resolve) => {
                const t = setTimeout(() => {
                    try { proc.kill('SIGKILL'); } catch {}
                    stderr += `\nProcess killed after ${timeoutMs}ms`;
                }, timeoutMs);
                proc.on('close', (c) => { clearTimeout(t); exitCode = c; resolve(); });
            });
        }

        if (useDocker) {
            try {
                const r = await dockerRun(language, code, stdin);
                stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
            } catch (err) {
                return res.status(400).json({ error: err.message || 'docker run failed' });
            }
        } else if (language === 'python') {
            const ok = await whereExe('python'); if (!ok) return res.status(400).json({ error: 'python not available' });
            const tmpDir = path.join(os.tmpdir(), 'codexa-run'); await fsp.mkdir(tmpDir, { recursive: true });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.py`);
            await fsp.writeFile(file, code, 'utf8');
            child = spawn('python', [file], { stdio: ['pipe', 'pipe', 'pipe'] });
            child.stdin.write(stdin); child.stdin.end();
            child.stdout.on('data', (d) => stdout += d.toString());
            child.stderr.on('data', (d) => stderr += d.toString());
            await withTimeout(child);
        } else if (language === 'bash') {
            let sh = 'bash';
            let args = ['-lc', code];
            let ok = await whereExe(sh);
            if (!ok && process.platform === 'win32') {
                sh = 'powershell';
                ok = await whereExe(sh);
                if (!ok) return res.status(400).json({ error: 'shell not available' });
                args = ['-NoProfile', '-Command', code];
            }
            child = spawn(sh, args, { stdio: ['pipe', 'pipe', 'pipe'] });
            child.stdin.write(stdin); child.stdin.end();
            child.stdout.on('data', (d) => stdout += d.toString());
            child.stderr.on('data', (d) => stderr += d.toString());
            await withTimeout(child);
        } else if (language === 'javascript' || language === 'jsx') {
            const ok = await whereExe('node'); if (!ok) return res.status(400).json({ error: 'node not available' });
            const tmpDir = path.join(os.tmpdir(), 'codexa-run'); await fsp.mkdir(tmpDir, { recursive: true });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.js`);
            const wrapper = `const fs=require('fs'); const input=fs.readFileSync(0,'utf8'); global.readLine=(function(){ const lines=String(input).split(new RegExp("\\r?\\n")); let i=0; return ()=> i<lines.length?lines[i++]:''; })();\n${code}`;
            await fsp.writeFile(file, wrapper, 'utf8');
            child = spawn('node', [file], { stdio: ['pipe', 'pipe', 'pipe'] });
            child.stdin.write(stdin); child.stdin.end();
            child.stdout.on('data', (d) => stdout += d.toString());
            child.stderr.on('data', (d) => stderr += d.toString());
            await withTimeout(child);
        } else if (language === 'typescript' || language === 'ts') {
            const okNode = await whereExe('node'); if (!okNode) return res.status(400).json({ error: 'node not available' });
            const okTsc = await whereExe('tsc'); if (!okTsc) return res.status(400).json({ error: 'tsc not available' });
            const tmpDir = path.join(os.tmpdir(), 'codexa-run'); await fsp.mkdir(tmpDir, { recursive: true });
            const tsfile = path.join(tmpDir, `main_${crypto.randomUUID()}.ts`);
            await fsp.writeFile(tsfile, code, 'utf8');
            const outDir = path.join(tmpDir, `out_${crypto.randomUUID()}`); await fsp.mkdir(outDir, { recursive: true });
            const compile = spawn('tsc', [tsfile, '--outDir', outDir], { stdio: ['ignore', 'pipe', 'pipe'] });
            let cstderr = '';
            compile.stderr.on('data', (d)=> cstderr += d.toString());
            const cexit = await new Promise((resolve)=> compile.on('close',(c)=> resolve(c)));
            if (cexit !== 0) return res.status(400).json({ error: 'tsc compile failed', stderr: cstderr, exitCode: cexit });
            const jsfile = path.join(outDir, path.basename(tsfile).replace(/\.ts$/, '.js'));
            const runner = path.join(outDir, `runner_${crypto.randomUUID()}.js`);
            const wrapper = `const fs=require('fs'); const input=fs.readFileSync(0,'utf8'); global.readLine=(function(){ const lines=String(input).split(new RegExp("\\\\r?\\\\n")); let i=0; return ()=> i<lines.length?lines[i++]:''; })(); require('${jsfile.replace(/\\/g, '\\\\')}');`;
            await fsp.writeFile(runner, wrapper, 'utf8');
            child = spawn('node', [runner], { stdio: ['pipe', 'pipe', 'pipe'] });
            child.stdin.write(stdin); child.stdin.end();
            child.stdout.on('data', (d) => stdout += d.toString());
            child.stderr.on('data', (d) => stderr += d.toString());
            await withTimeout(child);
        } else {
            return res.status(400).json({ error: `language ${language} not supported` });
        }

        const durationMs = Date.now() - start;
        function trunc(s) { return s && s.length > 100000 ? s.slice(0, 100000) + '\n...truncated...' : s; }
        res.json({ ok: true, stdout: trunc(stdout), stderr: trunc(stderr), exitCode, durationMs, language });
    } catch (e) {
        res.status(500).json({ error: 'Run failed' });
    }
});

// --- Aliases matching requested endpoints without /api prefix ---
app.post('/run', async (req, res) => {
    // Reuse logic by invoking the handler directly
    const { language, code, stdin = '', useDocker = false } = req.body || {};
    req.body = { language, code, stdin, useDocker };
    return app._router.handle({ ...req, url: '/api/run', method: 'POST' }, res, () => {});
});

app.post('/compile', async (req, res) => {
    const { language, code } = req.body || {};
    req.body = { language, code };
    return app._router.handle({ ...req, url: '/api/compile', method: 'POST' }, res, () => {});
});

app.post('/executeTestcases', async (req, res) => {
    const { language, code, testcases = [], useDocker = false } = req.body || {};
    req.body = { language, code, testcases, useDocker };
    return app._router.handle({ ...req, url: '/api/executeTestcases', method: 'POST' }, res, () => {});
});
app.post('/room/:roomId/testcases/save', async (req, res) => {
    const { roomId } = req.params;
    req.url = `/api/room/${roomId}/testcases/save`;
    return app._router.handle(req, res, () => {});
});
app.get('/room/:roomId/testcases/load', async (req, res) => {
    const { roomId } = req.params;
    req.url = `/api/room/${roomId}/testcases/load`;
    return app._router.handle(req, res, () => {});
});

app.post('/api/compile', async (req, res) => {
    try {
        const { language, code } = req.body || {};
        if (!language || typeof code !== 'string') return res.status(400).json({ error: 'language and code required' });
        const tmpDir = path.join(os.tmpdir(), 'codexa-run'); await fsp.mkdir(tmpDir, { recursive: true });
        let ok = false, cmd = '', args = [], bin = '';
        if (language === 'c') {
            ok = await whereExe('gcc'); if (!ok) return res.status(400).json({ error: 'gcc not available' });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.c`);
            await fsp.writeFile(file, code, 'utf8');
            bin = path.join(tmpDir, `a_${crypto.randomUUID()}.exe`);
            cmd = 'gcc'; args = [file, '-O2', '-o', bin];
        } else if (language === 'cpp' || language === 'c++') {
            ok = await whereExe('g++'); if (!ok) return res.status(400).json({ error: 'g++ not available' });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.cpp`);
            await fsp.writeFile(file, code, 'utf8');
            bin = path.join(tmpDir, `a_${crypto.randomUUID()}.exe`);
            cmd = 'g++'; args = [file, '-O2', '-std=c++17', '-o', bin];
        } else if (language === 'java') {
            ok = await whereExe('javac'); if (!ok) return res.status(400).json({ error: 'javac not available' });
            const file = path.join(tmpDir, `Main_${crypto.randomUUID()}.java`);
            await fsp.writeFile(file, code, 'utf8');
            cmd = 'javac'; args = [file]; bin = file.replace(/\.java$/, '.class');
        } else if (language === 'go') {
            ok = await whereExe('go'); if (!ok) return res.status(400).json({ error: 'go not available' });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.go`);
            await fsp.writeFile(file, code, 'utf8');
            bin = path.join(tmpDir, `a_${crypto.randomUUID()}.exe`);
            cmd = 'go'; args = ['build', '-o', bin, file];
        } else if (language === 'rust') {
            ok = await whereExe('rustc'); if (!ok) return res.status(400).json({ error: 'rustc not available' });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.rs`);
            await fsp.writeFile(file, code, 'utf8');
            bin = path.join(tmpDir, `a_${crypto.randomUUID()}.exe`);
            cmd = 'rustc'; args = ['-O', file, '-o', bin];
        } else if (language === 'typescript' || language === 'ts') {
            ok = await whereExe('tsc'); if (!ok) return res.status(400).json({ error: 'tsc not available' });
            const file = path.join(tmpDir, `main_${crypto.randomUUID()}.ts`);
            await fsp.writeFile(file, code, 'utf8');
            cmd = 'tsc'; args = [file, '--outDir', tmpDir]; bin = file.replace(/\.ts$/, '.js');
        } else {
            return res.status(400).json({ error: `compile not supported for ${language}` });
        }
        const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '', stderr = ''; child.stdout.on('data', (d)=>stdout+=d.toString()); child.stderr.on('data',(d)=>stderr+=d.toString());
        const exitCode = await new Promise((resolve)=> child.on('close',(c)=> resolve(c)));
        return res.json({ ok: exitCode === 0, stdout, stderr, exitCode, artifact: bin });
    } catch (e) {
        res.status(500).json({ error: 'Compile failed' });
    }
});

app.post('/api/executeTestcases', async (req, res) => {
    try {
        const { language, code, testcases = [], useDocker = false } = req.body || {};
        if (!language || typeof code !== 'string' || !Array.isArray(testcases)) return res.status(400).json({ error: 'invalid payload' });
        const normalize = (s) => String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        const results = [];
        for (const tc of testcases) {
            const r = await fetch(`${req.protocol}://${req.get('host')}/api/run`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ language, code, stdin: tc.input || '', useDocker }) });
            const j = await r.json();
            const actualRaw = j.stdout || '';
            const expectedRaw = tc.expected || '';
            const actual = normalize(actualRaw);
            const expected = normalize(expectedRaw);
            const pass = (actual === expected) && (j.exitCode === 0);
            function diffLines(a, b) {
                const al = normalize(a).split('\n');
                const bl = normalize(b).split('\n');
                const n = Math.max(al.length, bl.length);
                const out = [];
                for (let i=0; i<n; i++) {
                    const ev = bl[i] ?? '';
                    const av = al[i] ?? '';
                    if (ev !== av) out.push({ line: i+1, expected: ev, actual: av });
                }
                return out;
            }
            results.push({ input: tc.input || '', expected, actual, exitCode: j.exitCode, stderr: j.stderr || '', pass, diff: pass ? [] : diffLines(expectedRaw, actualRaw) });
        }
        res.json({ results });
    } catch (e) { res.status(500).json({ error: 'Execute testcases failed' }); }
});
