import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

// Get the base admin server URL (strip /api/admin path if present)
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001';
  
  // For production URLs like https://toklo.xyz/api/admin, extract base URL
  if (apiUrl.includes('/api/admin')) {
    return apiUrl.replace('/api/admin', '');
  }
  
  return apiUrl;
};

const SOCKET_URL = getSocketUrl();

console.log('🔌 WebSocket connecting to:', SOCKET_URL);

export function useWebSocket(onEventCallbacks = {}) {
  const socketRef = useRef(null)
  const callbacksRef = useRef(onEventCallbacks)

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = onEventCallbacks
  }, [onEventCallbacks])

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id)
      
      // Authenticate with JWT token
      const token = localStorage.getItem('admin_token')
      if (token) {
        socket.emit('authenticate', token)
      }
    })

    socket.on('welcome', (data) => {
      console.log('👋 WebSocket welcome:', data.message)
    })

    socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('🔐 WebSocket authenticated')
      } else {
        console.warn('⚠️ WebSocket authentication failed:', data.error)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      console.error('🔍 Connection details:', {
        url: SOCKET_URL,
        transport: error.description?.transport?.name || 'unknown',
        statusCode: error.description?.statusCode || 'N/A'
      });
      console.error('💡 Possible issues:');
      console.error('   1. Admin server not running on', SOCKET_URL);
      console.error('   2. CORS not configured for', window.location.origin);
      console.error('   3. Network/firewall blocking connection');
      console.error('   4. HTTPS/WSS mismatch');
    });

    // Emergency stop event
    socket.on('emergency:stop', (data) => {
      console.log('🚨 Emergency stop received:', data)
      if (callbacksRef.current.onEmergencyStop) {
        callbacksRef.current.onEmergencyStop(data)
      }
    })

    // Stats update event
    socket.on('stats:update', (data) => {
      console.log('📊 Stats update received:', data)
      if (callbacksRef.current.onStatsUpdate) {
        callbacksRef.current.onStatsUpdate(data)
      }
    })

    // Alert event
    socket.on('alert:new', (data) => {
      console.log('⚠️ New alert received:', data)
      if (callbacksRef.current.onNewAlert) {
        callbacksRef.current.onNewAlert(data)
      }
    })

    // Contract status change
    socket.on('contract:status', (data) => {
      console.log('📜 Contract status change:', data);
      if (callbacksRef.current.onContractStatus) {
        callbacksRef.current.onContractStatus(data);
      }
    });
    
    // Notification campaign sent event
    socket.on('notification:campaign_sent', (data) => {
      console.log('📢 New campaign notification received:', data);
      if (callbacksRef.current.onNotificationReceived) {
        callbacksRef.current.onNotificationReceived(data);
      }
    });
    
    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect();
        console.log('WebSocket disconnected on cleanup');
      }
    };
  }, [])

  // Emit function
  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data)
    }
  }

  return { socket: socketRef, emit }
}

export default useWebSocket
