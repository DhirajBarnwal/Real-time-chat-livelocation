import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Group API functions
export const createGroup = async (groupData) => {
  try {
    const response = await api.post('/groups/create', groupData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserGroups = async () => {
  try {
    const response = await api.get('/groups');
    return response.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
    return { success: false, groups: [] };
  }
};

// User API functions
export const getOnlineUsers = async () => {
  try {
    const response = await api.get('/users/online');
    return response.data;
  } catch (error) {
    console.error('Error fetching online users:', error);
    return { success: false, users: [] };
  }
};

export const updateUser = async (id, data) => {
  try {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAvatar = async (id, file) => {
  try {
    const form = new FormData();
    form.append('avatar', file);
    const token = localStorage.getItem('token');
    const url = `${API_URL}/users/${id}/avatar`;
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || JSON.stringify(data) || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const uploadMessageFile = async (file) => {
  try {
    const form = new FormData();
    form.append('file', file);
    const token = localStorage.getItem('token');
    const url = `${API_URL}/messages/upload`;
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || JSON.stringify(data) || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const changePassword = async (id, currentPassword, newPassword) => {
  try {
    const response = await api.post(`/users/${id}/change-password`, { currentPassword, newPassword });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;