/**
 * Socket.IO Client Service
 * Manages WebSocket connection for real-time features
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

class SocketService {
    private socket: Socket | null = null;
    private token: string | null = null;

    /**
     * Initialize socket connection with authentication token
     */
    connect(authToken: string): void {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.token = authToken;

        this.socket = io(SOCKET_URL, {
            auth: {
                token: authToken
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket?.id);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });
    }

    /**
     * Disconnect socket
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 Socket manually disconnected');
        }
    }

    /**
     * Check if socket is connected
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Listen for new notifications
     */
    onNewNotification(callback: (notification: any) => void): void {
        if (!this.socket) {
            console.warn('Socket not connected');
            return;
        }
        this.socket.on('new_notification', callback);
    }

    /**
     * Listen for notification marked as read
     */
    onNotificationRead(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on('notification_read', callback);
    }

    /**
     * Listen for all notifications marked as read
     */
    onAllNotificationsRead(callback: () => void): void {
        if (!this.socket) return;
        this.socket.on('all_notifications_read', callback);
    }

    /**
     * Listen for appointment updates
     */
    onAppointmentUpdated(callback: (appointment: any) => void): void {
        if (!this.socket) return;
        this.socket.on('appointment_updated', callback);
    }

    /**
     * Listen for queue updates
     */
    onQueueUpdated(callback: (queueData: any) => void): void {
        if (!this.socket) return;
        this.socket.on('queue_updated', callback);
    }

    /**
     * Join a doctor's queue for live updates
     */
    joinQueue(doctorId: number): void {
        if (!this.socket) return;
        this.socket.emit('join_queue', doctorId);
        console.log(`📊 Joined queue for doctor ${doctorId}`);
    }

    /**
     * Leave a doctor's queue
     */
    leaveQueue(doctorId: number): void {
        if (!this.socket) return;
        this.socket.emit('leave_queue', doctorId);
        console.log(`👋 Left queue for doctor ${doctorId}`);
    }

    /**
     * Update queue (for doctors)
     */
    updateQueue(data: { doctorId: number; currentQueue: number; estimatedWait: number }): void {
        if (!this.socket) return;
        this.socket.emit('update_queue', data);
    }

    /**
     * Get the socket instance
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Listen for events
     */
    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.socket) return;
        this.socket.on(event, callback);
    }

    /**
     * Remove all listeners for a specific event
     */
    off(event: string): void {
        if (!this.socket) return;
        this.socket.off(event);
    }

    /**
     * Remove all listeners
     */
    removeAllListeners(): void {
        if (!this.socket) return;
        this.socket.removeAllListeners();
    }
}

// Export singleton instance
export const socketService = new SocketService();
