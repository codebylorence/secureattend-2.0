import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Use environment variable for backend URL, remove /api suffix for socket connection
    let backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Remove /api suffix if present
    if (backendUrl.includes('/api')) {
      backendUrl = backendUrl.replace('/api', '');
    }
    
    console.log('🔌 Connecting to WebSocket at:', backendUrl);
    
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      forceNew: false
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnected from WebSocket server, reason: ${reason}`);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected to WebSocket server (attempt ${attemptNumber})`);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Attempting to reconnect... (attempt ${attemptNumber})`);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
