// [file name]: MessageReactions.js
import React, { useState } from 'react';
import { useSocket } from '../../utils/socket';

const MessageReactions = ({ message, currentUser, currentGroup }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const socket = useSocket();

  const commonReactions = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '😠', label: 'Angry' }
  ];

  const handleReaction = (emoji) => {
    if (socket) {
      const reactionData = {
        messageId: message._id,
        emoji,
        userId: currentUser._id,
        username: currentUser.username,
        groupId: currentGroup?._id
      };

      if (currentGroup) {
        socket.emit('react_group_message', reactionData);
      } else {
        socket.emit('react_message', reactionData);
      }
    }
    setShowReactionPicker(false);
  };

  const removeReaction = (emoji) => {
    if (socket) {
      const reactionData = {
        messageId: message._id,
        emoji,
        userId: currentUser._id,
        groupId: currentGroup?._id
      };

      if (currentGroup) {
        socket.emit('remove_group_reaction', reactionData);
      } else {
        socket.emit('remove_reaction', reactionData);
      }
    }
  };

  const getUserReaction = () => {
    return message.reactions?.find(r => r.userId === currentUser._id);
  };

  const userReaction = getUserReaction();

  return (
    <div className="message-reactions-container">
      {/* Reaction Picker */}
      {showReactionPicker && (
        <div className="reaction-picker">
          {commonReactions.map((reaction, index) => (
            <button
              key={index}
              className="reaction-option"
              onClick={() => handleReaction(reaction.emoji)}
              title={reaction.label}
            >
              <span className="reaction-emoji">{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reaction Summary */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="reaction-summary">
          {Object.entries(
            message.reactions.reduce((acc, reaction) => {
              acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
              return acc;
            }, {})
          ).map(([emoji, count], index) => (
            <div 
              key={index} 
              className={`reaction-badge ${userReaction?.emoji === emoji ? 'your-reaction' : ''}`}
              onClick={() => userReaction?.emoji === emoji ? removeReaction(emoji) : handleReaction(emoji)}
            >
              <span className="reaction-emoji-small">{emoji}</span>
              <span className="reaction-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reaction Button */}
      <button 
        className={`reaction-button ${userReaction ? 'has-reaction' : ''}`}
        onClick={() => setShowReactionPicker(!showReactionPicker)}
        title="Add Reaction"
      >
        {userReaction ? (
          <span className="user-reaction-emoji">{userReaction.emoji}</span>
        ) : (
          <i className="far fa-smile"></i>
        )}
      </button>
    </div>
  );
};

export default MessageReactions;
