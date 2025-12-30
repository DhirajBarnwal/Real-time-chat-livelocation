import React, { useState } from 'react';
import { login } from '../../utils/api';

const LoginForm = ({ onLogin, switchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login({ email, password });
      onLogin(response.user, response.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Use test@test.com / test123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <i className="fas fa-envelope input-icon"></i>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
        />
      </div>

      <div className="input-group">
        <i className="fas fa-lock input-icon"></i>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
        >
          <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
        </button>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading} 
        className={`auth-submit-btn ${loading ? 'loading' : ''}`}
      >
        {loading ? (
          <>
            <i className="fas fa-spinner fa-spin"></i> 
            Processing...
          </>
        ) : (
          <>
            Sign In
            <i className="fas fa-arrow-right"></i>
          </>
        )}
      </button>

      <div className="demo-credentials">
        <div className="demo-header">
          <i className="fas fa-key"></i>
          <span>Demo Credentials</span>
        </div>
        <div className="demo-details">
          <div className="demo-field">
            <span>Email:</span>
            <code>test@test.com</code>
          </div>
          <div className="demo-field">
            <span>Password:</span>
            <code>test123</code>
          </div>
        </div>
      </div>

      <div className="auth-footer">
        <p>
          Don't have an account? 
          <button 
            type="button"
            onClick={switchToRegister} 
            className="switch-link"
          >
            Sign Up
          </button>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;