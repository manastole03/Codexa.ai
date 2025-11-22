import React from 'react';

const Client = ({ username, compact = false }) => {
  const initials = (username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={compact ? 'client compact' : 'client'}>
      <div className={`avatarCircle ${compact ? 'small' : ''}`} aria-label={username} title={username}>
        {initials || 'U'}
      </div>
      {!compact && <span className="userName">{username || 'Unknown'}</span>}
    </div>
  );
};

export default Client;