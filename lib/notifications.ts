/**
 * Browser Notification Utilities
 * Provides system-level notifications for Windows and macOS
 */

export type NotificationPermission = "default" | "granted" | "denied"

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return "denied"
  }

  if (Notification.permission === "granted") {
    return "granted"
  }

  if (Notification.permission === "denied") {
    return "denied"
  }

  try {
    const permission = await Notification.requestPermission()
    return permission as NotificationPermission
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return "denied"
  }
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  if (!("Notification" in window)) {
    return false
  }
  return Notification.permission === "granted"
}

/**
 * Show a system notification
 */
export function showSystemNotification(
  title: string,
  options?: {
    body?: string
    icon?: string
    badge?: string
    tag?: string
    requireInteraction?: boolean
    silent?: boolean
    onClick?: () => void
  }
): Notification | null {
  if (!canShowNotifications()) {
    console.warn("Notifications are not permitted")
    return null
  }

  try {
    const notification = new Notification(title, {
      body: options?.body || "",
      icon: options?.icon || "/icon-light-32x32.png",
      badge: options?.badge || "/icon-light-32x32.png",
      tag: options?.tag,
      requireInteraction: options?.requireInteraction || false,
      silent: options?.silent || false,
    })

    // Handle click event
    if (options?.onClick) {
      notification.onclick = (event) => {
        event.preventDefault()
        options.onClick?.()
        notification.close()
        // Focus the window
        window.focus()
      }
    } else {
      // Default click behavior - focus the window
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }

    // Auto-close after 5 seconds if not clicked
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  } catch (error) {
    console.error("Error showing notification:", error)
    return null
  }
}

/**
 * Close all notifications with a specific tag
 */
export function closeNotificationsByTag(tag: string): void {
  // Notifications API doesn't provide a direct way to close by tag
  // This is a placeholder for future implementation if needed
}
