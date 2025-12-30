// [file name]: MessagesContainer.js

import React, { useRef, useEffect, useState } from 'react';
import EditMessageModal from '../UI/EditMessageModal';
import MessageReactions from '../UI/MessageReactions';
import { useSocket } from '../../utils/socket';

const MessagesContainer = ({ messages, currentUser, currentGroup, onRetryUpload }) => {
  const messagesEndRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, message: null });
  const socket = useSocket();
  const [retryingIds, setRetryingIds] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    
    // Only allow editing for user's own messages
    if (message.sender?._id === currentUser._id) {
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        message
      });
    }
  };

  const handleEditMessage = (message) => {
    setSelectedMessage(message);
    setShowEditModal(true);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleReplyMessage = (message) => {
    // dispatch an event so InputArea can pick it up and prefill reply
    window.dispatchEvent(new CustomEvent('reply-to-message', { detail: { message } }));
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handlePinMessage = (message) => {
    try {
      if (socket) socket.emit('pin_message', { messageId: message._id, groupId: currentGroup?._id });
      console.log('Pinned message:', message._id);
    } catch (e) {
      console.warn('Pin emit failed', e.message);
    }
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleForwardMessage = async (message) => {
    const toUser = window.prompt('Forward to (user id or username):');
    if (!toUser) return setContextMenu({ show: false, x: 0, y: 0, message: null });
    try {
      if (socket) socket.emit('forward_message', { to: toUser, message });
      console.log('Forwarded message to', toUser);
    } catch (e) {
      console.warn('Forward failed', e.message);
    }
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleShareMessage = (message) => {
    const shareText = message.content || '';
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Message copied to clipboard');
      });
    }
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleReportMessage = async (message) => {
    const reason = window.prompt('Report reason (optional):');
    try {
      if (socket) socket.emit('report_message', { messageId: message._id, reason });
      console.log('Reported message', message._id, 'reason:', reason);
    } catch (e) {
      console.warn('Report failed', e.message);
    }
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleDeleteMessage = (message) => {
    // Implement delete logic here
    console.log('Delete message:', message);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  useEffect(() => {
    // Close context menu when clicking outside it or outside the actions button
    const handleDocumentClick = (e) => {
      const tgt = e.target;
      // If click is inside the context menu or the actions button, do nothing
      if (tgt.closest && (tgt.closest('.context-menu') || tgt.closest('.message-actions-btn'))) return;
      setContextMenu({ show: false, x: 0, y: 0, message: null });
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Filter out bot/system messages (e.g., 'Mike Brown' test bot or messages with type 'system')
  const visibleMessages = (messages || []).filter(msg => {
    const senderName = (msg.sender && msg.sender.username) ? String(msg.sender.username).toLowerCase() : '';
    if (!msg) return false;
    if (msg.type === 'system') return false;
    if (senderName === 'mike brown' || senderName === 'mike' || senderName === 'bot') return false;
    if (msg.sender && msg.sender.role === 'bot') return false;
    return true;
  });

  if (visibleMessages.length === 0) {
    return (
      <div className="empty-chat">
        <div className="welcome-illustration">
          <i className="fas fa-comments"></i>
        </div>
        <h2>Welcome to TeamChat</h2>
        <p>Start a conversation by sending your first message!</p>
      </div>
    );
  }

  return (
    <>
      <div className="messages-container">
        {visibleMessages.map((msg) => (
          <div 
            key={msg._id} 
            className={`message-wrapper ${msg.sender?._id === currentUser._id ? 'sent' : 'received'} ${msg.edited ? 'edited' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
          >
            <div className="message-content-wrapper">
              {msg.sender?._id !== currentUser._id && (
                <span className="sender-name">{msg.sender?.username}</span>
              )}
              <div className={`message-bubble ${msg.type === 'error' ? 'message-error' : ''}`}>
                <button
                  className="message-actions-btn"
                  aria-label="message actions"
                  onClick={(e) => {
                    // stop propagation so click doesn't trigger other handlers
                    e.stopPropagation();
                    // open context menu anchored to button
                    setContextMenu({
                      show: true,
                      x: e.currentTarget.getBoundingClientRect().right - 120,
                      y: e.currentTarget.getBoundingClientRect().top + 20,
                      message: msg
                    });
                  }}
                >
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                <p>
                  {msg.type === 'error' ? (
                    <span style={{ color: '#b71c1c' }}><i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i>{msg.content}</span>
                  ) : (
                    msg.content
                  )}
                </p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="message-attachments">
                    {msg.attachments.map((att, idx) => (
                      <div key={idx} className="message-attachment-item">
                        {att.fileType && att.fileType.startsWith('image') ? (
                          <img src={(att.fileUrl.startsWith('http') ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')) + att.fileUrl} alt={att.fileName} />
                        ) : (
                          <a href={(att.fileUrl.startsWith('http') ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')) + att.fileUrl} target="_blank" rel="noreferrer">{att.fileName}</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {msg.edited && (
                  <div className="edited-indicator">
                    <i className="fas fa-edit"></i>
                    <span>edited</span>
                  </div>
                )}

                {msg.type === 'error' && msg.failedAttachment && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn"
                      onClick={async () => {
                        if (!onRetryUpload) return;
                        setRetryingIds(prev => [...prev, msg._id]);
                        try {
                          await onRetryUpload(msg._id);
                        } catch (err) {
                          alert('Retry failed: ' + (err?.message || 'unknown'));
                        } finally {
                          setRetryingIds(prev => prev.filter(id => id !== msg._id));
                        }
                      }}
                      disabled={retryingIds.includes(msg._id)}
                    >
                      {retryingIds.includes(msg._id) ? 'Retrying...' : 'Retry Upload'}
                    </button>
                  </div>
                )}
                
                {/* Add Message Reactions */}
                <MessageReactions 
                  message={msg}
                  currentUser={currentUser}
                  currentGroup={currentGroup}
                />
                
                <div className="message-meta">
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {msg.sender?._id === currentUser._id && (
                    <i className="fas fa-check-double message-status"></i>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
        >
          <ul>
            <li onClick={() => handleReplyMessage(contextMenu.message)}>
              <i className="fas fa-reply"></i> Reply
            </li>
            <li onClick={() => handleCopyText(contextMenu.message.content)}>
              <i className="fas fa-copy"></i> Copy
            </li>
            <li onClick={() => handleShareMessage(contextMenu.message)}>
              <i className="fas fa-share"></i> Share
            </li>
            <li onClick={() => handleForwardMessage(contextMenu.message)}>
              <i className="fas fa-forward"></i> Forward
            </li>
            <li onClick={() => handlePinMessage(contextMenu.message)}>
              <i className="fas fa-thumbtack"></i> Pin
            </li>
            <li onClick={() => handleReportMessage(contextMenu.message)} className="danger">
              <i className="fas fa-flag"></i> Report
            </li>
            {contextMenu.message && contextMenu.message.sender?._id === currentUser._id && (
              <li onClick={() => handleDeleteMessage(contextMenu.message)} className="danger">
                <i className="fas fa-trash"></i> Delete
              </li>
            )}
            <li onClick={() => setContextMenu({ show: false, x: 0, y: 0, message: null })}>
              <i className="fas fa-times"></i> Cancel
            </li>
          </ul>
        </div>
      )}

      {/* Edit Message Modal */}
      <EditMessageModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMessage(null);
        }}
        message={selectedMessage}
        currentUser={currentUser}
        currentGroup={currentGroup}
      />
    </>
  );
};

export default MessagesContainer;
