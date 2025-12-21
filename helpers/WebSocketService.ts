import { io, Socket } from 'socket.io-client';
import { CONFIG } from '~/config';
import Session from './Session';

class WebSocketService {
    private socket: Socket | null = null;
    private isConnected = false;

    async connect() {
        if (this.socket?.connected) {
            return this.socket;
        }

        try {
            // Get access token for authentication
            const token = await Session.getCookie('x-access-token');

            if (!token) {
                console.warn('No access token found for WebSocket connection');
                return null;
            }

            // Connect to WebSocket server
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

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    getSocket() {
        return this.socket;
    }

    isSocketConnected() {
        return this.isConnected && this.socket?.connected;
    }

    // Chat-specific methods
    joinChat(chatId: string) {
        if (this.socket?.connected) {
            this.socket.emit('chat:join', chatId);
        }
    }

    leaveChat(chatId: string) {
        if (this.socket?.connected) {
            this.socket.emit('chat:leave', chatId);
        }
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

    onNewMessage(callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on('message:new', callback);
        }
    }

    onMessageRead(callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on('message:read', callback);
        }
    }

    onTypingIndicator(callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on('typing:indicator', callback);
        }
    }

    onUserOnline(callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on('user:online', callback);
        }
    }

    onUserOffline(callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on('user:offline', callback);
        }
    }

    // Remove listeners
    offNewMessage(callback?: (data: any) => void) {
        if (this.socket) {
            this.socket.off('message:new', callback);
        }
    }

    offMessageRead(callback?: (data: any) => void) {
        if (this.socket) {
            this.socket.off('message:read', callback);
        }
    }

    offTypingIndicator(callback?: (data: any) => void) {
        if (this.socket) {
            this.socket.off('typing:indicator', callback);
        }
    }
}

// Export singleton instance
export default new WebSocketService();
