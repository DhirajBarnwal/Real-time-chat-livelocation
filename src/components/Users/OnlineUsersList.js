import React, { useState, useEffect } from 'react';
import { useSocket } from '../../utils/socket';
import UserItem from './UserItem';

const OnlineUsersList = ({ currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      // Support different server events: 'online_users' (array of usernames),
      // and 'online_users_list' (array of objects { userId, username })
      socket.on('online_users', handleOnlineUsers);
      socket.on('online_users_list', handleOnlineUsers);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);

      // Request initial online users
      socket.emit('get_online_users');

      return () => {
        socket.off('online_users');
        socket.off('online_users_list');
        socket.off('user_online');
        socket.off('user_offline');
      };
    }
  }, [socket]);

  const handleOnlineUsers = (users) => {
    // Normalize payload: support arrays of strings or objects
    if (!users) return;
    if (Array.isArray(users) && users.length > 0 && typeof users[0] === 'string') {
      setOnlineUsers(users.map((u, idx) => ({ userId: `u_${idx}`, username: u })));
    } else if (Array.isArray(users)) {
      setOnlineUsers(users.map(u => ({ userId: u.userId || u._id || u.id || (u.username || ''), username: u.username || u })));
    } else {
      setOnlineUsers([]);
    }
  };

  const handleUserOnline = (user) => {
    if (!onlineUsers.some(u => u.username === user.username)) {
      setOnlineUsers(prev => [...prev, user]);
    }
  };

  const handleUserOffline = (user) => {
    setOnlineUsers(prev => prev.filter(u => u.username !== user.username));
  };

  const filteredUsers = onlineUsers.filter(user => {
    const q = searchQuery || '';
    const username = (user.username || '').toLowerCase();
    const currentName = (currentUser && currentUser.username) ? currentUser.username : '';
    return username.includes(q.toLowerCase()) && user.username !== currentName;
  });

  return (
    <div className="users-list-container">
      <div className="users-list-header">
        <h4>Active Now ({filteredUsers.length})</h4>
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
          />
        </div>
      </div>

      <div className="users-list">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, idx) => (
            <UserItem key={idx} user={user} />
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-user-clock"></i>
            <p>No other users online</p>
            <small>You're the first one here!</small>
          </div>
        )}
      </div>

      <div className="users-stats">
        <div className="stat-item">
          <i className="fas fa-user-friends"></i>
          <span>Total Online: {onlineUsers.length}</span>
        </div>
        <div className="stat-item">
          <i className="fas fa-bolt"></i>
          <span>Active Now: {filteredUsers.length}</span>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsersList;