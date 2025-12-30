import React, { useState } from 'react';
import { register } from '../../utils/api';

const RegisterForm = ({ onLogin, switchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await register({ username, email, password });
      onLogin(response.user, response.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <i className="fas fa-user input-icon"></i>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          minLength={3}
          maxLength={30}
        />
      </div>

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
          placeholder="Password (min. 6 characters)"
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

      <div className="input-group">
        <i className="fas fa-lock input-icon"></i>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          required
          minLength={6}
        />
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
            Creating Account...
          </>
        ) : (
          <>
            Create Account
            <i className="fas fa-arrow-right"></i>
          </>
        )}
      </button>

      <div className="auth-footer">
        <p>
          Already have an account? 
          <button 
            type="button"
            onClick={switchToLogin} 
            className="switch-link"
          >
            Sign In
          </button>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;