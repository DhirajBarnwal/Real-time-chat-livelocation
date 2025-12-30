import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import './Auth.css';

const AuthContainer = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          {/* Left Side - Branding */}
          <div className="auth-branding">
            <div className="brand-logo">
              <i className="fas fa-comment-dots"></i>
            </div>
            <h1>TeamChat</h1>
            <p className="brand-subtitle">Connect • Communicate • Collaborate</p>
            <div className="brand-features">
              <div className="feature">
                <i className="fas fa-shield-alt"></i>
                <span>Secure & Private</span>
              </div>
              <div className="feature">
                <i className="fas fa-bolt"></i>
                <span>Real-time Messages</span>
              </div>
              <div className="feature">
                <i className="fas fa-users"></i>
                <span>Group Chats</span>
              </div>
              <div className="feature">
                <i className="fas fa-map-marker-alt"></i>
                <span>Live Location Sharing</span>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="auth-form">
            <div className="form-header">
              <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p>{isLogin ? 'Sign in to continue to TeamChat' : 'Sign up to get started'}</p>
            </div>

            <div className="auth-tabs">
              <button 
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(true)}
              >
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </button>
              <button 
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
              >
                <i className="fas fa-user-plus"></i>
                Sign Up
              </button>
            </div>

            {isLogin ? (
              <LoginForm onLogin={onLogin} />
            ) : (
              <RegisterForm onLogin={onLogin} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;