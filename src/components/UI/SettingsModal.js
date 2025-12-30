import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { updateAvatar, updateUser, changePassword } from '../../utils/api';

const getServerOrigin = () => {
  const api = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  return api.replace(/\/api\/?$/, '');
};

const SettingsModal = ({ isOpen, onClose, user, onSaveProfile }) => {
  const [gender, setGender] = useState(user?.settings?.gender || 'prefer_not_to_say');
  const [notifications, setNotifications] = useState(user?.settings?.notifications ?? true);
  const [emailNotifications, setEmailNotifications] = useState(user?.settings?.emailNotifications ?? true);
  const [soundEnabled, setSoundEnabled] = useState(user?.settings?.soundEnabled ?? true);
  const [avatarFile, setAvatarFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGender(user?.settings?.gender || 'prefer_not_to_say');
    setNotifications(user?.settings?.notifications ?? true);
    setEmailNotifications(user?.settings?.emailNotifications ?? true);
    setSoundEnabled(user?.settings?.soundEnabled ?? true);
    setAvatarFile(null);
    setCurrentPassword(''); setNewPassword('');
  }, [user, isOpen]);

  const [previewUrl, setPreviewUrl] = useState('');

  const handleAvatarChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setAvatarFile(f);
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedUser = null;
      // Upload avatar first if provided
      if (avatarFile) {
        const userId = user?._id || user?.id || (JSON.parse(localStorage.getItem('user') || '{}')._id);
        if (!userId) throw new Error('User id not available for avatar upload');
        console.log('Uploading avatar for user:', userId);
        const res = await updateAvatar(userId, avatarFile);
        updatedUser = res?.data?.user || res?.user || null;
        // If backend returns relative path, ensure parent sees it
      }

      const settings = {
        ...user.settings,
        gender,
        notifications,
        emailNotifications,
        soundEnabled
      };

      const data = { settings };
      const userId2 = user?._id || user?.id || (JSON.parse(localStorage.getItem('user') || '{}')._id);
      if (!userId2) throw new Error('User id not available for settings update');
      const res2 = await updateUser(userId2, data);
      // Let parent refresh user state (normalize response shape)
      const newUser = res2?.data || res2;
      if (onSaveProfile) await onSaveProfile(newUser);
      // If avatar returned from upload, clear preview
      if (updatedUser?.avatar) {
        const origin = getServerOrigin();
        setPreviewUrl(origin + (updatedUser.avatar.startsWith('/') ? '' : '/') + updatedUser.avatar);
      }
      onClose && onClose();
    } catch (err) {
        // Log detailed error and show readable message to user
        console.error('Save settings failed', err, err?.body);
        const message = err?.message || err?.body?.message || JSON.stringify(err?.body) || 'Save settings failed';
        alert(message);
        return;
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setPwSaving(true);
    try {
      await changePassword(user._id || user.id, currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword('');
      alert('Password changed successfully');
    } catch (err) {
      console.error('Change password failed', err);
      alert(err?.response?.data?.message || 'Change password failed');
    } finally {
      setPwSaving(false);
    }
  };

  const currentAvatar = previewUrl || (user?.avatar ? (getServerOrigin() + (user.avatar.startsWith('/') ? '' : '/') + user.avatar) : '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="medium">
      <div className="settings-grid">
        <div className="settings-section">
          <h4>Profile Picture</h4>
          {currentAvatar ? (
            <div style={{ marginBottom: 8 }}>
              <img src={currentAvatar} alt="avatar preview" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
            </div>
          ) : null}
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
          <small>Upload a square avatar (JPEG/PNG). Max 10MB.</small>
        </div>

        <div className="settings-section">
          <h4>Gender</h4>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <div className="settings-section">
          <h4>Notifications</h4>
          <label><input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} /> Enable notifications</label>
          <label><input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} /> Email notifications</label>
          <label><input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} /> Sound</label>
        </div>

        <div className="settings-section">
          <h4>Change Password</h4>
          <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={handleChangePassword} disabled={pwSaving}>{pwSaving ? 'Saving...' : 'Change Password'}</button>
          </div>
        </div>

        <div className="modal-actions" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
