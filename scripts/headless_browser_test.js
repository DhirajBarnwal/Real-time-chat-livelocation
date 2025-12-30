const puppeteer = require('puppeteer');

(async () => {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NGI3M2FiZDhmMWExMTRhOWMzNjEzYSIsImlhdCI6MTc2NjU1NDkwMiwiZXhwIjoxNzY3MTU5NzAyfQ._565V6k-3FL_N7HRYoHGujLK37LZpW5f0jX4Y9kyPjg";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Headless Socket Test</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  </head>
  <body>
    <script>
      const token = '${token}';
      const socket = io('http://localhost:5000', { transports: ['websocket','polling'] });

      console.log('🔌 Connecting to Socket.IO...');

      socket.on('connect', () => {
        console.log('✅ Connected:', socket.id);
        socket.emit('authenticate', token);
      });

      socket.on('authenticated', (data) => {
        console.log('✅ Authenticated as:', data?.username || data);
        setTimeout(() => {
          console.log('📤 Sending test message...');
          socket.emit('send_message', {
            content: 'Hello from Headless Browser test!',
            type: 'text',
            channel: 'general'
          });
        }, 800);
      });

      socket.on('new_message', (msg) => {
        console.log('📩 Message received:', msg.content, 'from', msg.sender?.username);
      });

      socket.on('auth_error', (err) => console.log('❌ Auth error:', err));
      socket.on('message_error', (err) => console.log('❌ Message error:', err));
      socket.on('connect_error', (err) => console.log('❌ Connection error:', err && err.message));

      socket.onAny((eventName, ...args) => {
        if (eventName !== 'new_message') {
          try { console.log('📡 Event:', eventName, args[0]); } catch(e) {}
        }
      });

      // keep the page alive
    </script>
  </body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--allow-insecure-localhost'
    ]
  });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('PAGE:', text);
  });

  try {
    await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(html), { waitUntil: 'networkidle2', timeout: 20000 });

    // Wait up to 10s for a new_message or auth error
    const start = Date.now();
    while (Date.now() - start < 10000) {
      if (logs.some(l => l.includes('📩 Message received') || l.includes('❌ Auth error') || l.includes('❌ Connection error'))) break;
      await new Promise(r => setTimeout(r, 200));
    }

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
    console.log('\n=== Captured Logs ===');
    logs.forEach(l => console.log(l));
    console.log('=== End logs ===');
    // Exit so run_in_terminal returns control
    process.exit(0);
  }
})();
