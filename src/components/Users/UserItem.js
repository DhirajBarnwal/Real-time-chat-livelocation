import React from 'react';
import { useSocket } from '../../utils/socket';

const UserItem = ({ user }) => {
  const socket = useSocket();

  const startDirectChat = () => {
    if (!socket) return;
    // emit an event or navigate to direct chat - for now send a typing event as a probe
    try {
      socket.sendDirectMessage && socket.sendDirectMessage(user.userId || user._id || user.id, `Hello ${user.username}!`);
    } catch (e) {
      console.warn('DM failed', e.message);
    }
  };

  return (
    <div className="user-item" onClick={startDirectChat}>
      <div className="user-avatar" style={{ backgroundColor: '#25d366' }}>
        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
      </div>
      <div className="user-info">
        <div className="user-name">{user.username || 'Unknown'}</div>
      </div>
    </div>
  );
};

export default UserItem;
