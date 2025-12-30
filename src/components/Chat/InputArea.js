// [file name]: InputArea.js

import React, { useState, useRef, useEffect } from 'react';
import LocationSharing from '../Location/LocationSharing';
import FileUpload from '../UI/FileUpload';
import EmojiPicker from '../UI/EmojiPicker';
import VoiceRecorder from '../Voice/VoiceRecorder';
import { useSocket } from '../../utils/socket';
import { uploadMessageFile } from '../../utils/api';

const InputArea = ({ 
  inputMessage, 
  setInputMessage, 
  sendMessage, 
  currentGroup,
  currentUser 
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false); // ADD THIS STATE
  const [attachments, setAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const fileInputRef = useRef(null);
  const socket = useSocket();

  useEffect(() => {
    const handler = (e) => {
      const message = e?.detail?.message;
      if (!message) return;
      setReplyTo(message);
      // Prepend mention if not already present
      setInputMessage(prev => {
        const mention = `@${message.sender?.username || ''} `;
        if (prev && prev.startsWith(mention)) return prev;
        return mention + (prev || '');
      });
      // focus input if available
      const el = document.querySelector('.message-input');
      el?.focus();
    };

    window.addEventListener('reply-to-message', handler);
    return () => window.removeEventListener('reply-to-message', handler);
  }, [setInputMessage]);

  const handleFileSelect = (files) => {
    const newAttachments = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.split('/')[0], // image, video, document
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleVoiceMessage = (audioBlob) => {
    if (socket) {
      const messageData = {
        type: 'voice',
        voice: audioBlob,
        duration: Math.floor(audioBlob.size / 1000), // Approximate duration
        groupId: currentGroup?._id,
        replyTo: replyTo?._id
      };

      if (currentGroup) {
        socket.emit('send_group_message', messageData);
      } else {
        socket.emit('send_message', messageData);
      }
    }
    setShowVoiceRecorder(false); // Close the recorder after sending
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (inputMessage.trim() || attachments.length > 0) {
      // Prepare message with attachments
      const messageData = { content: inputMessage, attachments: [], groupId: currentGroup?._id, replyTo: replyTo?._id };
      // Upload attachments first (if any)
      if (attachments.length > 0) {
        setUploadError('');
        for (const att of attachments) {
          try {
            const resp = await uploadMessageFile(att.file);
            // resp = { success:true, data: { fileUrl, fileName, fileSize, fileType } }
            const meta = resp?.data || resp;
            if (meta) {
              messageData.attachments.push({ fileUrl: meta.fileUrl, fileName: meta.fileName, fileSize: meta.fileSize, fileType: meta.fileType });
            }
          } catch (err) {
            console.error('Attachment upload failed', err, err?.body);
            const msg = err?.message || err?.body?.message || JSON.stringify(err?.body) || 'Attachment upload failed';
            setUploadError(msg);
            try {
              window.dispatchEvent(new CustomEvent('upload-error', { detail: { message: msg, fileName: att.name, file: att.file } }));
            } catch (e) {
              console.debug('Could not dispatch upload-error event', e.message);
            }
            // stop sending the message if uploads failed
            return;
          }
        }
      }

      // Emit message via socket
      if (currentGroup) {
        socket.emit('send_group_message', messageData);
      } else {
        socket.emit('send_message', messageData);
      }

      // Add message locally immediately
      const newMessage = {
        _id: Date.now().toString(),
        content: inputMessage,
        sender: {
          _id: currentUser._id,
          username: currentUser.username
        },
        timestamp: Date.now(),
        isYou: true
      };

      // Clear input and attachments
      setInputMessage('');
      setReplyTo(null);
      setAttachments([]);
      setUploadError('');
      
      // If you need to update messages in MainChat, you might need to pass a callback
      // Or let socket.io handle it
    }
  };

  const insertEmoji = (emoji) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="input-area">
      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onSendVoiceMessage={handleVoiceMessage}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map(attachment => (
            <div key={attachment.id} className="attachment-item">
              {attachment.preview ? (
                <div className="attachment-preview">
                  <img src={attachment.preview} alt={attachment.name} />
                  <button 
                    className="remove-attachment"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : (
                <div className="attachment-file">
                  <i className={`fas fa-file-${attachment.type === 'video' ? 'video' : 'document'}`}></i>
                  <span className="attachment-name">{attachment.name}</span>
                  <button 
                    className="remove-attachment"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="upload-error" style={{ color: '#b71c1c', background: 'rgba(183,28,28,0.06)', padding: 8, borderRadius: 6, margin: '8px 0' }}>
          <strong>Upload error:</strong> {uploadError}
        </div>
      )}

      {/* Main Input Area */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-meta">
            Replying to <strong>{replyTo.sender?.username}</strong>
            <button className="reply-cancel" onClick={() => setReplyTo(null)}>✕</button>
          </div>
          <div className="reply-snippet">{replyTo.content}</div>
        </div>
      )}

      <div className="message-input-wrapper">
        {/* Voice Message Button */}
        <button 
          className="voice-message-btn"
          onClick={() => setShowVoiceRecorder(true)}
          title="Voice Message"
        >
          <i className="fas fa-microphone"></i>
        </button>
        
        {/* Location Button */}
        <LocationSharing currentGroup={currentGroup} currentUser={currentUser} />
        
        {/* File Upload Button */}
        <button 
          className="file-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach File"
        >
          <i className="fas fa-paperclip"></i>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />
        </button>
        
        {/* Emoji Button */}
        <div className="emoji-container">
          <button 
            className="emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji"
          >
            <i className="far fa-smile"></i>
          </button>
          
          {showEmojiPicker && (
            <EmojiPicker 
              onSelect={insertEmoji} 
              onClose={() => setShowEmojiPicker(false)} 
            />
          )}
        </div>
        
        {/* Message Input */}
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Message ${currentGroup ? currentGroup.name : 'General Chat'}...`}
          className="message-input"
        />
        
        {/* Send Button */}
        <button 
          onClick={handleSend}
          className="send-button"
          disabled={!inputMessage.trim() && attachments.length === 0}
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

export default InputArea;
