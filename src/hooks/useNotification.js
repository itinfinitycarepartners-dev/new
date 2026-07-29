// hooks/useNotification.js
import { useCallback } from 'react';

export function useNotification() {
  const showNotification = useCallback(({ title, body, onClick, icon }) => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: icon || '/favicon.ico',
        tag: 'message-notification',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notification.close();
      };

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000);
    }
  }, []);

  return { showNotification };
}