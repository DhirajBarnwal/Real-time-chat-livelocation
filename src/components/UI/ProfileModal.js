import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const ProfileModal = ({ isOpen, onClose, user, onSave }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
    setBio(user?.bio || '');
  }, [user, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = { ...user, username: username.trim(), bio: bio.trim() };
      // If parent provided an onSave handler, call it. Parent may call API.
      if (onSave) await onSave(updated);
      onClose && onClose();
    } catch (err) {
      console.error('Profile save failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="small">
      <div className="profile-modal-form">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />

        <label>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />

        <div className="modal-actions">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}> {saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;
