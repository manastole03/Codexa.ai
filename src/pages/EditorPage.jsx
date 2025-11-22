import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Client from '../components/Client';
import Editor from '../components/Editor'
import AIChat from '../components/AIChat'
import { language, cmtheme } from '../../src/atoms';
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


    const socketRef = useRef(null);
    const codeRef = useRef(null);
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


    function sendMessage() {
        const msg = chatInput.trim();
        if (!msg) return;
        try {
            socketRef.current?.emit(ACTIONS.CHAT_MESSAGE, {
                roomId,
                username: location.state?.username,
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


    if (!location.state) {
        return <Navigate to="/" />;
    }


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
                    <select value={lang} onChange={(e) => { setLang(e.target.value); window.location.reload(); }} className="seLang">
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
                            title={t.title}
                        >
                            {t.title}
                        </button>
                    ))}
                    <button className="addTabBtn" onClick={addTab}>+</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="tabItem" onClick={shareActiveTab}>Share</button>
                        <button className="tabItem" onClick={downloadActiveTab}>Download</button>
                        <button className="tabItem" onClick={saveCurrentTab}>Save</button>
                    </div>
                </div>
                <Editor
                    key={activeTabId}
                    socketRef={socketRef}
                    roomId={roomId}
                    tabId={activeTabId}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                        setTabCodes((prev) => ({ ...prev, [activeTabId]: code }));
                    }}
                    onSelectionToChat={(sel) => {
                        setActiveTab('ai');
                        setAiPresetInput(sel);
                    }}
                    externalCode={externalCode}
                    acceptRemote={acceptRemote}
                />
            </div>

            <div className="rightAside">
                <div className="rightTabs">
                    <button className={`tabBtn ${activeTab==='chat'?'active':''}`} onClick={() => setActiveTab('chat')}>Room Chat</button>
                    <button className={`tabBtn ${activeTab==='ai'?'active':''}`} onClick={() => setActiveTab('ai')}>AI Assistant</button>
                </div>

                {activeTab === 'chat' && (
                    <>
                        <div className="messages" ref={messagesRef}>
                            {messages.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={`message ${m.username === location.state?.username ? 'own' : ''}`}
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
                    <AIChat
                        username={location.state?.username}
                        preset={aiPresetInput}
                        onApply={(mode, text) => applyAiToEditor(text, mode)}
                        roomId={roomId}
                        socketRef={socketRef}
                    />
                )}
            </div>
        </div>
    );
}

export default EditorPage;