import React from 'react';

const ChatHeader = ({ currentGroup, isTyping }) => {
  return (
    <div className="chat-header">
      <div className="chat-partner">
        <div className="partner-avatar">
          {currentGroup ? (
            <i className="fas fa-users"></i>
          ) : (
            <i className="fas fa-globe"></i>
          )}
        </div>
        <div className="partner-info">
          <h2>{currentGroup ? currentGroup.name : 'General Chat'}</h2>
          <p>
            {currentGroup 
              ? `${currentGroup.participants?.length || 0} members • `
              : `0 online • `
            }
            {isTyping && <span className="typing-indicator">typing...</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;