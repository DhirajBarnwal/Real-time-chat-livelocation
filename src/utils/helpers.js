// Helper functions for TeamChat

export const getAvatarColor = (username) => {
  if (!username) return '#008069';
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', 
    '#118AB2', '#EF476F', '#7209B7', '#3A86FF',
    '#008069', '#25D366', '#FF9500', '#5856D6'
  ];
  
  // Create a hash from the username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const formatTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const getRandomLastSeen = () => {
  const times = ['2 min ago', '5 min ago', '10 min ago', '30 min ago', '1 hour ago'];
  return times[Math.floor(Math.random() * times.length)];
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Initialize user data
export const initializeUserData = (user) => {
  return {
    _id: user._id || user.id,
    username: user.username || 'User',
    email: user.email || '',
    avatar: user.avatar || '',
    status: user.status || 'online',
    avatarColor: getAvatarColor(user.username || 'User')
  };
};