import React, { useState, useEffect } from 'react';
import { useSocket } from '../../utils/socket';

const CreateGroupModal = ({ isOpen, onClose, onCreateGroup, currentUser }) => {
  const socket = useSocket();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (socket) {
      // Listen for online users list
      const handleList = (users) => {
        if (!users) return;
        // users expected as [{ userId, username }]
        setOnlineUsers(users.filter(u => (u.username || '') !== (currentUser?.username || '')));
      };

      socket.on('online_users_list', handleList);
      socket.on('online_users', (arr) => {
        // array of usernames -> convert
        if (Array.isArray(arr)) {
          const mapped = arr.map((u, i) => ({ userId: `u_${i}`, username: u }));
          handleList(mapped);
        }
      });

      // Request current online users
      try { socket.emit('get_online_users'); } catch (e) {}

      return () => {
        socket.off('online_users_list');
        socket.off('online_users');
      };
    }
  }, [isOpen, socket, currentUser]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(u => u !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert('Please provide group name and select at least one member');
      return;
    }

    setLoading(true);
    try {
      // Use socket create_group so all participants are notified
      if (socket && socket.emit) {
        socket.emit('create_group', { name: groupName, participants: selectedUsers });
      }
      setGroupName('');
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      alert(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Group</h3>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label>Select Members ({onlineUsers.length} online)</label>
            <div className="users-selector">
              {onlineUsers.map((user) => (
                <div 
                  key={user.userId}
                  className={`user-select-item ${selectedUsers.includes(user.userId) ? 'selected' : ''}`}
                  onClick={() => toggleUserSelection(user.userId)}
                >
                  <div 
                    className="select-avatar"
                    style={{ backgroundColor: user.avatarColor || '#25d366' }}
                  >
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="select-name">{user.username}</span>
                  {selectedUsers.includes(user.userId) && (
                    <i className="fas fa-check check-icon"></i>
                  )}
                </div>
              ))}
              
              {onlineUsers.length === 0 && (
                <div className="no-users-message">
                  <i className="fas fa-users"></i>
                  <p>No other users online</p>
                  <small>Invite friends to join the chat!</small>
                </div>
              )}
            </div>
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="selected-users">
              <h4>Selected ({selectedUsers.length})</h4>
              <div className="selected-list">
                {selectedUsers.map((userId, idx) => {
                  const u = onlineUsers.find(x => x.userId === userId);
                  return (
                    <div key={idx} className="selected-tag">
                      {u?.username || userId}
                      <button 
                        onClick={() => toggleUserSelection(userId)}
                        className="remove-tag"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-plus"></i>
            )}
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;