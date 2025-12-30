// [file name]: EditMessageModal.js
import React, { useState, useEffect } from 'react';
import { useSocket } from '../../utils/socket';

const EditMessageModal = ({ isOpen, onClose, message, currentUser, currentGroup }) => {
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (message) {
      setEditedContent(message.content || '');
    }
  }, [message]);

  const handleSave = () => {
    if (!editedContent.trim() || editedContent === message.content) {
      onClose();
      return;
    }

    setLoading(true);
    
    if (socket) {
      const editData = {
        messageId: message._id,
        newContent: editedContent,
        groupId: currentGroup?._id,
        editedAt: Date.now()
      };

      if (currentGroup) {
        socket.emit('edit_group_message', editData);
      } else {
        socket.emit('edit_message', editData);
      }
    }

    setLoading(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen || !message) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-message-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fas fa-edit"></i> Edit Message</h3>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="original-message-preview">
            <div className="message-header">
              <div className="sender-avatar">
                {message.sender?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="sender-info">
                <span className="sender-name">
                  {message.sender?._id === currentUser._id ? 'You' : message.sender?.username}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="original-content">
              <p>{message.content}</p>
            </div>
          </div>
          
          <div className="edit-form">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Edit your message..."
              className="edit-textarea"
              rows={4}
              autoFocus
            />
            
            <div className="edit-info">
              <i className="fas fa-info-circle"></i>
              <span>Press Enter to save, Esc to cancel</span>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={handleSave}
            disabled={!editedContent.trim() || editedContent === message.content || loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMessageModal;
