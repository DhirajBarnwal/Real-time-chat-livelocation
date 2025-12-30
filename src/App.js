import React, { useState, useEffect } from 'react';
import './App.css';
import AuthContainer from './components/Auth/AuthContainer';
import MainChat from './components/Chat/MainChat';
import { SocketProvider } from './utils/socket';
import DarkModeToggle from './components/UI/DarkModeToggle';
import { updateUser as apiUpdateUser } from './utils/api';


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const parsed = JSON.parse(savedUser);
      const userWithToken = { ...parsed, token };
      setUser(userWithToken);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  // Ensure dark mode preference applied on app mount (in case toggle wasn't mounted yet)
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    try {
      const isDark = saved ? JSON.parse(saved) : false;
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-mode');
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('dark-mode');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    const userWithToken = { ...userData, token };
    localStorage.setItem('user', JSON.stringify(userWithToken));
    setUser(userWithToken);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
  };

  const handleUpdateProfile = async (updated) => {
    if (!user) return;
    try {
      let newUser = null;
      // If caller passed a full user object, merge and persist
      if (updated && (updated._id || updated.id || updated.username || updated.avatar)) {
        newUser = { ...user, ...updated };
      } else {
        const res = await apiUpdateUser(user._id || user.id, updated);
        newUser = res?.data || res;
      }
      // keep token if present
      if (user.token) newUser.token = user.token;
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return newUser;
    } catch (e) {
      console.error('Profile update failed', e);
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <SocketProvider user={user}>
      <div className="app">
        <div className="dark-mode-toggle-container">
          <DarkModeToggle />
        </div>
        {!isLoggedIn ? (
          <AuthContainer onLogin={handleLogin} />
        ) : (
          <MainChat user={user} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />
        )}
      </div>
      
    </SocketProvider>
  );
}

export default App;