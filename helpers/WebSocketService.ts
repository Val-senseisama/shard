import { io, Socket } from 'socket.io-client';
import { CONFIG } from '~/config';
import Session from './Session';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private activeChats = new Set<string>();

  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      const token = await Session.getCookie('x-access-token');
      if (!token) {
        console.warn('No access token found for WebSocket connection');
        return null;
      }

      this.socket = io(CONFIG.WS_ENDPOINT, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.startHeartbeat();
        // Rejoin rooms the client was in before disconnect
        if (this.activeChats.size > 0) {
          this.activeChats.forEach((chatId) => {
            this.socket?.emit('chat:join', chatId);
          });
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      return null;
    }
  }

  startHeartbeat(intervalMs = 30000) {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.activeChats.clear();
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  // ─── Chat room management ─────────────────────────────────────────────────

  joinChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('chat:join', chatId);
    }
    this.activeChats.add(chatId);
  }

  leaveChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('chat:leave', chatId);
    }
    this.activeChats.delete(chatId);
  }

  sendTypingStart(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { chatId });
    }
  }

  sendTypingStop(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { chatId });
    }
  }

  // ─── Event subscriptions (off-before-on prevents stacking) ───────────────

  onNewMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('message:new', callback);
      this.socket.on('message:new', callback);
    }
  }

  offNewMessage(callback?: (data: any) => void) {
    this.socket?.off('message:new', callback);
  }

  onTypingIndicator(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('typing:indicator', callback);
      this.socket.on('typing:indicator', callback);
    }
  }

  offTypingIndicator(callback?: (data: any) => void) {
    this.socket?.off('typing:indicator', callback);
  }

  onMessageRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('message:read', callback);
      this.socket.on('message:read', callback);
    }
  }

  offMessageRead(callback?: (data: any) => void) {
    this.socket?.off('message:read', callback);
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void) {
    if (this.socket) {
      this.socket.off('message:deleted', callback);
      this.socket.on('message:deleted', callback);
    }
  }

  offMessageDeleted(callback?: (data: any) => void) {
    this.socket?.off('message:deleted', callback);
  }

  onMessageEdited(callback: (data: { messageId: string; content: string }) => void) {
    if (this.socket) {
      this.socket.off('message:edited', callback);
      this.socket.on('message:edited', callback);
    }
  }

  offMessageEdited(callback?: (data: any) => void) {
    this.socket?.off('message:edited', callback);
  }

  onMessageReaction(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    if (this.socket) {
      this.socket.off('message:reaction', callback);
      this.socket.on('message:reaction', callback);
    }
  }

  offMessageReaction(callback?: (data: any) => void) {
    this.socket?.off('message:reaction', callback);
  }

  onMessageReactionRemoved(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    if (this.socket) {
      this.socket.off('message:reaction:removed', callback);
      this.socket.on('message:reaction:removed', callback);
    }
  }

  offMessageReactionRemoved(callback?: (data: any) => void) {
    this.socket?.off('message:reaction:removed', callback);
  }

  onPollVoted(callback: (data: { messageId: string; options: { text: string; votes: string[] }[] }) => void) {
    if (this.socket) {
      this.socket.off('message:poll:voted', callback);
      this.socket.on('message:poll:voted', callback);
    }
  }

  offPollVoted(callback?: (data: any) => void) {
    this.socket?.off('message:poll:voted', callback);
  }

  onUserOnline(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('user:online', callback);
      this.socket.on('user:online', callback);
    }
  }

  offUserOnline(callback?: (data: any) => void) {
    this.socket?.off('user:online', callback);
  }

  onUserOffline(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('user:offline', callback);
      this.socket.on('user:offline', callback);
    }
  }

  offUserOffline(callback?: (data: any) => void) {
    this.socket?.off('user:offline', callback);
  }
}

export default new WebSocketService();
