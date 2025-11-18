import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3009';

// Extract base URL without /api path
const getSocketUrl = () => {
  const url = new URL(API_BASE_URL);
  return `${url.protocol}//${url.host}`;
};

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize socket connection
   */
  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    const socketUrl = getSocketUrl();
    console.log('Connecting to WebSocket server:', socketUrl);

    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return this.socket;
  }

  /**
   * Join admin room to receive admin notifications
   */
  joinAdminRoom(userData: { email: string; role: string }) {
    if (!this.socket) {
      console.error('Socket not initialized. Call connect() first.');
      return;
    }

    console.log('Joining admin room with user:', userData);
    this.socket.emit('join-admin', userData);

    this.socket.once('joined-admin', (response) => {
      console.log('Successfully joined admin room:', response);
    });
  }

  /**
   * Listen for new request notifications
   */
  onNewRequest(callback: (request: any) => void) {
    if (!this.socket) {
      console.error('Socket not initialized. Call connect() first.');
      return;
    }

    this.socket.on('new-request', callback);
  }

  /**
   * Remove listener for new request notifications
   */
  offNewRequest() {
    if (!this.socket) return;
    this.socket.off('new-request');
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
