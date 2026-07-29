// services/WebSocketManager.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageHandlers = new Map();
    this.isConnecting = false;
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.token = null;
    this.wsUrl = null;
  }

  async connect(token) {
    if (this.isConnected || this.isConnecting) return;
    
    this.token = token;
    this.isConnecting = true;
    
    // Determine WebSocket URL based on environment
    const apiHost = process.env.API_HOST || 'localhost:4000';
    const protocol = __DEV__ ? 'ws' : 'wss';
    this.wsUrl = `${protocol}://${apiHost}/ws?token=${token}`;
    
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.triggerHandler('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        if (event.code !== 1000) {
          this.reconnect();
        }
        this.triggerHandler('disconnected');
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnected = false;
        this.isConnecting = false;
        this.triggerHandler('error', error);
      };

    } catch (error) {
      console.error('[WebSocket] Connect error:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      this.triggerHandler('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(data) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  handleMessage(data) {
    switch (data.type) {
      case 'new_message':
        this.triggerHandler('new_message', data.message);
        break;

      case 'typing':
        this.triggerHandler('typing', {
          conversationId: data.conversationId,
          senderEmail: data.senderEmail,
          isTyping: data.isTyping,
        });
        break;

      case 'connection':
        this.triggerHandler('connection_status', data);
        break;

      case 'pong':
        // Heartbeat response - ignore
        break;

      default:
        console.log('[WebSocket] Unknown message type:', data.type);
    }
  }

  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).delete(handler);
    }
  }

  triggerHandler(event, data) {
    if (this.messageHandlers.has(event)) {
      for (const handler of this.messageHandlers.get(event)) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Handler error for ${event}:`, error);
        }
      }
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.token = null;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
    };
  }
}

export default new WebSocketManager();