import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Portal = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleCreateGroup = () => {
    const id = uuidV4();
    setRoomId(id);
    setShowModal(true);
    toast.success('Created a new group room');
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied');
    } catch (e) {
      toast.error('Could not copy Room ID');
    }
  };

  return (
    <div className="portalPageWrapper">
      <div className="portalHero">
        <img className="portalLogo" src="/codexa.png" alt="logo" />
        <h1 className="portalTitle">Collaborate with your team</h1>
        <p className="portalSubtitle">Choose what you want to do</p>
      </div>

      <div className="portalCards">
        <div className="portalCard" onClick={() => navigate('/chat')}>
          <div className="portalIcon">💬</div>
          <h3>Chat with Group</h3>
          <p>Real-time messages in your room</p>
        </div>
        <div className="portalCard" onClick={() => navigate('/') }>
          <div className="portalIcon">🧑‍💻</div>
          <h3>Codexa.ai</h3>
          <p>Collaborative code editing</p>
        </div>
        <div className="portalCard" onClick={handleCreateGroup}>
          <div className="portalIcon">👥</div>
          <h3>Create Group</h3>
          <p>Create a unique room ID</p>
        </div>
      </div>

      {showModal && (
        <div className="portalModalOverlay" onClick={() => setShowModal(false)}>
          <div className="portalModal" onClick={(e) => e.stopPropagation()}>
            <h2>Your Room is Ready</h2>
            <div className="portalRoomBox">
              <code>{roomId}</code>
              <button className="btn copyBtn" onClick={copyRoomId}>Copy</button>
            </div>
            <p className="portalModalInfo">Share this ID with your team. Over 10 people can join.</p>
            <div className="portalModalActions">
              <button className="btn" onClick={() => navigate('/chat')}>Go to Chat</button>
              <button className="btn" onClick={() => navigate('/')}>Go to Codexa.ai</button>
              <button className="btn leaveBtn" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portal;