import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messageQueue = useRef([]); // Queue for messages sent before authentication
  const listeners = useRef([]); // Store listeners registered before socket is ready

  useEffect(() => {
    if (user && user.token) {
      console.log('🔌 Connecting Socket.IO...');
      setConnectionStatus('connecting');
      
      const newSocket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection established
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setConnectionStatus('connected');
        
        // CRITICAL: Send authentication with token
        console.log('🔐 Authenticating with token...');
        newSocket.emit('authenticate', user.token);
      });

      // Re-register any listeners that were added before socket was ready
      if (listeners.current.length > 0) {
        listeners.current.forEach(l => {
          try {
            newSocket.on(l.event, l.callback);
          } catch (e) {
            console.warn('Failed to attach queued listener', l.event, e);
          }
        });
      }

      // Authentication successful
      newSocket.on('authenticated', (data) => {
        console.log('✅ Socket authenticated as:', data.username);
        setIsAuthenticated(true);
        setConnectionStatus('authenticated');
        
        // Send any queued messages
        if (messageQueue.current.length > 0) {
          console.log(`📤 Sending ${messageQueue.current.length} queued messages...`);
          messageQueue.current.forEach(msg => {
            newSocket.emit(msg.event, msg.data);
          });
          messageQueue.current = [];
        }
      });

      // Authentication failed
      newSocket.on('auth_error', (error) => {
        console.log('❌ Socket authentication failed:', error);
        setIsAuthenticated(false);
        setConnectionStatus('auth_failed');
      });

      // Receive messages
      newSocket.on('new_message', (message) => {
        console.log('📩 Message received:', message);
        // You can add a global message handler here
      });

      // Connection errors
      newSocket.on('connect_error', (err) => {
        console.log('❌ Socket connection error:', err.message);
        setConnectionStatus('error');
      });

      // Disconnect
      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsAuthenticated(false);
        setConnectionStatus('disconnected');
      });

      setSocket(newSocket);

      return () => {
        console.log('🧹 Cleaning up socket connection...');
        newSocket.disconnect();
        setConnectionStatus('disconnected');
      };
    }
  }, [user]);

  // Create a socket utility with authentication check
  const socketWithAuth = useMemo(() => ({
    // Event helpers so components can call socket.on/off/emit directly
    on: (event, callback) => {
      console.debug('[socket] on()', event);
      listeners.current.push({ event, callback });
      if (socket && typeof socket.on === 'function') {
        socket.on(event, callback);
      }
    },

    off: (event, callback) => {
      console.debug('[socket] off()', event);
      if (callback) {
        listeners.current = listeners.current.filter(l => !(l.event === event && l.callback === callback));
        if (socket) {
          try {
            if (typeof socket.off === 'function') socket.off(event, callback);
            else if (typeof socket.removeListener === 'function') socket.removeListener(event, callback);
          } catch (e) {
            console.warn('[socket] off(event, callback) failed', e);
          }
        }
      } else {
        // Remove all listeners for this event
        listeners.current = listeners.current.filter(l => l.event !== event);
        if (socket) {
          try {
            if (typeof socket.removeAllListeners === 'function') socket.removeAllListeners(event);
            else if (typeof socket.off === 'function') socket.off(event);
          } catch (e) {
            console.warn('[socket] off(event) failed', e);
          }
        }
      }
    },

    emit: (event, data) => {
      console.debug('[socket] emit()', event, data);
      if (socket && typeof socket.emit === 'function') {
        socket.emit(event, data);
        return true;
      }
      // If socket not ready, queue as a message (best-effort)
      messageQueue.current.push({ event, data });
      return 'queued';
    },
    // Send message with authentication check
    sendMessage: (content, channel = 'general') => {
      console.debug('[socket] sendMessage()', { content, channel, isAuthenticated, socketExists: !!socket });
      if (!socket) {
        console.log('❌ Socket not initialized');
        return false;
      }

      if (!isAuthenticated) {
        console.log('⏳ Queueing message - waiting for authentication...');
        messageQueue.current.push({
          event: 'send_message',
          data: { content, type: 'text', channel }
        });
        return 'queued';
      }

      console.log('📤 Sending message:', content);
      socket.emit('send_message', {
        content,
        type: 'text',
        channel
      });
      return true;
    },

    // Send direct message
    sendDirectMessage: (toUserId, content) => {
      if (!socket || !isAuthenticated) {
        console.log('❌ Not authenticated');
        return false;
      }
      
      socket.emit('send_direct_message', {
        toUserId,
        content,
        type: 'text'
      });
      return true;
    },

    // Join a room
    joinRoom: (room) => {
      if (!socket || !isAuthenticated) {
        console.log('❌ Not authenticated');
        return false;
      }
      
      socket.emit('join_room', { room });
      return true;
    },

    // Get current socket instance
    getSocket: () => socket,
    
    // Get authentication status
    getStatus: () => ({
      isAuthenticated,
      connectionStatus,
      socketId: socket?.id
    })
  }), [socket, isAuthenticated, connectionStatus]);

  return (
    <SocketContext.Provider value={socketWithAuth}>
      {children}
    </SocketContext.Provider>
  );
};