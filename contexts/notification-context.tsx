"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react"
import { useAuth } from "./auth-context"
import { requestNotificationPermission, canShowNotifications, showSystemNotification } from "@/lib/notifications"

export interface AppNotification {
  id: number
  type: "feedback" | "comment" | "status_change" | "assignment" | "asset_uploaded"
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
  fromUser: {
    id: number
    username: string
    role: string
  } | null
  request: {
    id: string
    drmCode: string
    name: string
  } | null
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationIds: number[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  lastFetchTime: Date | null
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const POLLING_INTERVAL = 5000 // Poll every 5 seconds for near real-time updates

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const { user, isAuthenticated } = useAuth()
  const previousNotificationIds = useRef<Set<number>>(new Set())
  const notificationPermissionRequested = useRef(false)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/notifications?limit=50")
      const data = await res.json()

      if (data.success) {
        const newNotifications = data.notifications
        const currentIds = new Set(newNotifications.map((n: AppNotification) => n.id))
        
        // Find new notifications that weren't in the previous set
        const newNotificationIds = newNotifications
          .filter((n: AppNotification) => !previousNotificationIds.current.has(n.id))
          .map((n: AppNotification) => n.id)

        // Show system notifications for new unread notifications
        if (newNotificationIds.length > 0 && canShowNotifications()) {
          newNotifications
            .filter((n: AppNotification) => newNotificationIds.includes(n.id) && !n.read)
            .forEach((notification: AppNotification) => {
              showSystemNotification(notification.title, {
                body: notification.message,
                tag: `notification-${notification.id}`,
                requireInteraction: false,
                onClick: () => {
                  if (notification.link) {
                    window.location.href = notification.link
                  }
                },
              })
            })
        }

        // Update previous notification IDs
        previousNotificationIds.current = currentIds

        setNotifications(newNotifications)
        setUnreadCount(data.unreadCount)
        setLastFetchTime(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const markAsRead = async (notificationIds: number[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      })

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  // Note: We don't automatically request permission on mount
  // Browsers require user interaction to show permission prompts
  // Permission should be requested via user action (e.g., clicking a button)

  // Initial fetch on mount and when auth changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Polling for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return

    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, POLLING_INTERVAL)

    return () => clearInterval(pollInterval)
  }, [isAuthenticated, fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        lastFetchTime,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

