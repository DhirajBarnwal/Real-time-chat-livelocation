const io = require('socket.io-client');

const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NGI3M2FiZDhmMWExMTRhOWMzNjEzYSIsImlhdCI6MTc2NjU1NDkwMiwiZXhwIjoxNzY3MTU5NzAyfQ._565V6k-3FL_N7HRYoHGujLK37LZpW5f0jX4Y9kyPjg";

function createAdminSocket() {
  const socket = io('http://localhost:5000', { transports: ['websocket','polling'] });
  socket.on('connect', () => console.log('Admin connected', socket.id));
  socket.on('authenticated', (data) => console.log('Admin authenticated', data));
  socket.on('new_direct_message_sent', (msg) => console.log('Admin send confirmed:', msg.content));
  socket.on('message_error', (err) => console.log('Admin message_error:', err));
  socket.on('connect_error', (err) => console.log('Admin connect_error:', err && err.message));
  return socket;
}

function createTestSocket() {
  const socket = io('http://localhost:5000', { transports: ['websocket','polling'] });
  socket.on('connect', () => console.log('Test client connected', socket.id));
  socket.on('authenticated', (data) => console.log('Test client authenticated', data));
  socket.on('new_direct_message', (msg) => console.log('Test client received DM:', msg.content, 'from', msg.sender && msg.sender.username));
  socket.on('connect_error', (err) => console.log('Test connect_error:', err && err.message));
  return socket;
}

(async () => {
  const admin = createAdminSocket();
  const test = createTestSocket();

  // Wait for both to connect
  await new Promise(res => setTimeout(res, 800));

  // Authenticate admin with token
  admin.emit('authenticate', adminToken);

  // Make test client perform test_auth auto-auth
  test.emit('test_auth');

  // Capture test user's id once authenticated
  let testUserId = null;
  test.on('authenticated', (data) => {
    testUserId = data.userId;
    console.log('Captured testUserId =', testUserId);

    // Now admin sends a direct message to test user
    setTimeout(() => {
      console.log('Admin sending DM to', testUserId);
      admin.emit('send_direct_message', { toUserId: testUserId, content: 'Hello from admin (direct test)!' });
    }, 300);
  });

  // Wait for delivery or timeout
  await new Promise(res => setTimeout(res, 5000));
  process.exit(0);
})();
