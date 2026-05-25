import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import ACTIONS from '../Actions';
import { initSocket } from '../socket';
import Client from '../components/Client';

const ChatPage = () => {
  const { roomId: routeRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [formRoomId, setFormRoomId] = useState('');
  const [formUsername, setFormUsername] = useState('');

  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const socketRef = useRef(null);

  // Join form when there is no room in route
  if (!routeRoomId || !location.state) {
    const createNewRoom = (e) => {
      e?.preventDefault?.();
      const id = uuidV4();
      setFormRoomId(id);
      toast.success('Created a new room');
    };

    const joinChat = () => {
      if (!formRoomId || !formUsername) {
        toast.error('ROOM ID & username is required');
        return;
      }
      navigate(`/chat/${formRoomId}`, { state: { username: formUsername } });
    };

    const handleInputEnter = (e) => {
      if (e.code === 'Enter') joinChat();
    };

    return (
      <div className="homePageWrapper">
        <div className="formWrapper">
          <img className="homePageLogo" src="/codexa.png" alt="chat-logo" />
          <h4 className="mainLabel">Join Group Chat</h4>
          <div className="inputGroup">
            <input
              type="text"
              className="inputBox"
              placeholder="ROOM ID"
              onChange={(e) => setFormRoomId(e.target.value)}
              value={formRoomId}
              onKeyUp={handleInputEnter}
            />
            <input
              type="text"
              className="inputBox"
              placeholder="USERNAME"
              onChange={(e) => setFormUsername(e.target.value)}
              value={formUsername}
              onKeyUp={handleInputEnter}
            />
            <button className="btn joinBtn" onClick={joinChat}>Join Chat</button>
            <span className="createInfo">
              Need a room? &nbsp;
              <a onClick={createNewRoom} href="" className="createNewBtn">create one</a>
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { roomId } = { roomId: routeRoomId };
  const username = location.state?.username;

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on('connect_error', (err) => handleErrors(err));
      socketRef.current.on('connect_failed', (err) => handleErrors(err));

      function handleErrors(e) {
        console.log('socket error', e);
        toast.error('Socket connection failed, try again later.');
        navigate('/');
      }

      socketRef.current.emit(ACTIONS.JOIN, { roomId, username });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username: joinedUser }) => {
        if (joinedUser !== username) {
          toast.success(`${joinedUser} joined the room.`);
        }
        setClients(clients.map((c) => ({
          ...c,
          username: c.username || (c.socketId === socketRef.current?.id ? username : 'Unknown')
        })));
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUser }) => {
        toast.success(`${leftUser} left the room.`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });

      socketRef.current.on(ACTIONS.CHAT_MESSAGE, ({ message, username, timestamp }) => {
        setMessages((prev) => [...prev, { message, username, timestamp }]);
      });
    };
    init();
    return () => {
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
      socketRef.current?.off(ACTIONS.CHAT_MESSAGE);
      socketRef.current?.disconnect();
    };
  }, [roomId, username]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID has been copied to your clipboard');
    } catch (err) {
      toast.error('Could not copy the Room ID');
      console.error(err);
    }
  };

  function leaveRoom() {
    navigate('/');
  }

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text) return;
    const timestamp = Date.now();
    socketRef.current.emit(ACTIONS.CHAT_MESSAGE, { roomId, message: text, username, timestamp });
    setMessageInput('');
  };

  const handleMessageEnter = (e) => {
    if (e.code === 'Enter') sendMessage();
  };

  return (
    <div className="chatWrap">
      <div className="chatAside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/codexa.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>Copy ROOM ID</button>
        <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
      </div>

      <div className="chatArea">
        <div className="messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`message ${m.username === username ? 'own' : ''}`}>
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
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyUp={handleMessageEnter}
          />
          <button className="btn sendBtn" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
