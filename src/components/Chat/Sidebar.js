import React, { useState, useRef, useEffect } from 'react';
import { getAvatarColor } from '../../utils/helpers';
import ProfileModal from '../UI/ProfileModal';
import SettingsModal from '../UI/SettingsModal';

const Sidebar = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  groups = [], 
  currentGroup, 
  joinGroup, 
  setShowCreateGroupModal,
  onLogout,
  onlineUsers = []
  , onUpdateProfile
}) => {
  // Map of online usernames will be passed via global state in the future
  // For now, Sidebar will receive online counts via group.participants
  // Safely get avatar color
  const userAvatarColor = user && user.username ? getAvatarColor(user.username) : '#008069';
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (!showProfileMenu) return;
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [showProfileMenu]);
  
  return (
    <div className="sidebar">
      {/* User Profile */}
      <div className="user-profile">
        <div 
          className="user-avatar"
          style={{ backgroundColor: userAvatarColor }}
        >
          {user?.avatar ? (
            <img src={(user.avatar.startsWith('http') ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')) + user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          ) : (
            user?.username?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
        <div className="user-info">
          <h3>{user?.username || 'User'}</h3>
          <p>Online</p>
        </div>
        <div className="sidebar-actions">
          <button 
            className="icon-btn" 
            title="New Group"
            onClick={() => setShowCreateGroupModal(true)}
          >
            <i className="fas fa-users"></i>
          </button>
          <div className="profile-menu-wrapper" ref={profileMenuRef}>
            <button
              className="icon-btn"
              title="Menu"
              onClick={() => setShowProfileMenu(prev => !prev)}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            {showProfileMenu && (
              <div className="profile-menu" onClick={(e) => e.stopPropagation()}>
                <button className="profile-menu-item" onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}>
                  Edit Profile
                </button>
                <button className="profile-menu-item" onClick={() => { /* future: open bio editor */ setShowProfileModal(true); setShowProfileMenu(false); }}>
                  Add / Edit Bio
                </button>
                <button className="profile-menu-item" onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}>
                  Settings
                </button>
                <button className="profile-menu-item logout" onClick={() => { setShowProfileMenu(false); onLogout && onLogout(); }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search messages..." />
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button 
          className={`tab-btn ${activeTab === 'chats' && !currentGroup ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('chats');
            if (joinGroup) joinGroup(null);
          }}
        >
          <i className="fas fa-comment-alt"></i>
          Chats
        </button>
        <button 
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <i className="fas fa-users"></i>
          Groups
          <span className="online-count">{groups.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'online' ? 'active' : ''}`}
          onClick={() => setActiveTab('online')}
        >
          <i className="fas fa-user-friends"></i>
          Online
          <span className="online-count">0</span>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="sidebar-content">
        {activeTab === 'chats' && (
          <div className="chats-list">
            <h4>Recent Chats</h4>
            <div className="chat-item" onClick={() => joinGroup && joinGroup(null)}>
              <div className="chat-avatar general">
                <i className="fas fa-globe"></i>
              </div>
              <div className="chat-info">
                <div className="chat-header">
                  <span className="chat-name">General Chat</span>
                  <span className="chat-time">Just now</span>
                </div>
                <p className="chat-preview">Welcome to the general chat</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="groups-list">
            <div className="groups-header">
              <h4>Your Groups ({groups.length})</h4>
              <button 
                className="create-group-btn"
                onClick={() => setShowCreateGroupModal && setShowCreateGroupModal(true)}
              >
                <i className="fas fa-plus"></i> New Group
              </button>
            </div>
            
            {groups.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users"></i>
                <p>No groups yet</p>
                <small>Create your first group!</small>
              </div>
            ) : (
              groups.map((group) => {
                const groupAvatarColor = group?.name ? getAvatarColor(group.name) : '#54656f';
                // Compute online participants for this group
                let onlineCount = 0;
                try {
                  const participantIds = (group.participants || []).map(p => (typeof p === 'string' ? p : (p._id || p.id || p.userId || p)));
                  onlineCount = participantIds.filter(pid => onlineUsers.some(u => u.userId === pid || u.username === pid)).length;
                } catch (e) { onlineCount = 0; }

                return (
                  <div 
                    key={group._id || group.id} 
                    className={`group-item ${currentGroup?._id === group._id ? 'active' : ''}`}
                    onClick={() => joinGroup && joinGroup(group._id || group.id)}
                  >
                    <div 
                      className="group-avatar"
                      style={{ backgroundColor: groupAvatarColor }}
                    >
                      <i className="fas fa-users"></i>
                    </div>
                    <div className="group-info">
                      <div className="group-header">
                        <span className="group-name">{group.name || 'Unnamed Group'}</span>
                        <span className="group-members">
                          {group.participants?.length || 0} members
                          {onlineCount > 0 && <span className="group-online"> · {onlineCount} online</span>}
                        </span>
                      </div>
                      <p className="group-last-message">
                        {group.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSave={async (updated) => {
          try {
            if (onUpdateProfile) await onUpdateProfile(updated);
          } catch (e) { console.error('onUpdateProfile failed', e); }
        }}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onSaveProfile={async (userObj) => {
          try {
            if (onUpdateProfile) await onUpdateProfile(userObj);
          } catch (e) { console.error('onSaveProfile failed', e); }
        }}
      />

      {/* Logout Button */}
      <button onClick={onLogout} className="logout-btn-sidebar">
        <i className="fas fa-sign-out-alt"></i>
        Logout
      </button>
    </div>
  );
};

export default Sidebar;