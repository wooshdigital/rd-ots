/**
 * Browser Notification Utility
 * Handles browser notification permission and display
 */

export class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('Notification permission:', this.permission);
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a browser notification
   */
  show(title: string, options?: NotificationOptions): Notification | null {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show notification for new overtime request
   */
  showNewRequestNotification(request: {
    id: number;
    employee_name: string;
    request_type: string;
    hours: number;
    minutes: number;
  }) {
    const title = `New ${request.request_type} Request`;
    const body = `${request.employee_name} submitted a request for ${request.hours}h ${request.minutes}m`;

    const notification = this.show(title, {
      body,
      tag: `request-${request.id}`, // Prevents duplicate notifications
      requireInteraction: true, // Notification stays until user interacts
      data: { requestId: request.id },
    });

    // Click handler to focus window
    if (notification) {
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    return notification;
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
