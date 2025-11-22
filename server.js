require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { fetch } = require('undici');

const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

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
function getAllConnectedClients(roomId) {
    // Map
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

    // Group chat messages within a room
    socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message, username, timestamp }) => {
        io.to(roomId).emit(ACTIONS.CHAT_MESSAGE, { message, username, timestamp });
    });

    // Owner can remove a participant
    socket.on(ACTIONS.REMOVE_PARTICIPANT, ({ roomId, targetSocketId }) => {
        if (roomOwners[roomId] !== socket.id) return; // only owner
        const target = io.sockets.sockets.get(targetSocketId);
        if (!target) return;
        io.to(targetSocketId).emit(ACTIONS.KICKED, { roomId });
        target.leave(roomId);
    });

    // Owner can delete the room (kick everyone and clear owner)
    socket.on(ACTIONS.DELETE_ROOM, ({ roomId }) => {
        if (roomOwners[roomId] !== socket.id) return; // only owner
        io.to(roomId).emit(ACTIONS.ROOM_DELETED, { roomId });
        const roomSet = io.sockets.adapter.rooms.get(roomId) || new Set();
        for (const sockId of roomSet) {
            const s = io.sockets.sockets.get(sockId);
            s && s.leave(roomId);
        }
        delete roomOwners[roomId];
        delete roomCodes[roomId];
        delete roomTabs[roomId];
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
            // If owner leaves, reassign to next client or clear
            if (roomOwners[roomId] === socket.id) {
                const clients = getAllConnectedClients(roomId).filter(c => c.socketId !== socket.id);
                if (clients.length > 0) {
                    roomOwners[roomId] = clients[0].socketId;
                } else {
                    delete roomOwners[roomId];
                    delete roomCodes[roomId];
                    delete roomTabs[roomId];
                    delete roomAI[roomId];
                }
            }
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
app.use(cors());
app.use(express.json());

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
        const model = process.env.OPENROUTER_MODEL || 'kwaipilot/kat-coder-pro:free';
        const { messages } = req.body || {};
        if (!key || !messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing OPENROUTER_API_KEY or messages' });
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
            body: JSON.stringify({ model, messages })
        });
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) {
            const err = ct.includes('application/json') ? await r.json() : { error: await r.text() };
            return res.status(r.status).json(err);
        }
        const data = ct.includes('application/json') ? await r.json() : { text: await r.text() };
        const text = data?.choices?.[0]?.message?.content || data?.text || data?.error || JSON.stringify(data);
        return res.json({ text });
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
