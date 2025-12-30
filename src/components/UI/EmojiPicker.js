import React from 'react';

const EmojiPicker = ({ onSelect, onClose }) => {
  const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
    hands: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪'],
    objects: ['💡', '📱', '📞', '☎️', '📟', '📠', '🔋', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀'],
    symbols: ['✅', '✔️', '❌', '❎', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '🔄', '⏪', '⏩', '⏫', '⏬', '🎵', '🎶']
  };

  return (
    <div className="emoji-picker">
      <div className="emoji-picker-header">
        <span>Emoji</span>
        <button className="close-emoji" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="emoji-categories">
        {Object.entries(emojiCategories).map(([category, emojis]) => (
          <div key={category} className="emoji-category">
            <h5>{category.charAt(0).toUpperCase() + category.slice(1)}</h5>
            <div className="emoji-grid">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  className="emoji-item"
                  onClick={() => onSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;