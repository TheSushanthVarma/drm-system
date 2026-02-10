"use client"

import { useState, useEffect } from "react"
import { Menu, Bell, LogOut, User, MessageSquare, CheckCircle, UserPlus, Upload, RefreshCw, Check, ExternalLink, Settings, Sun, Moon } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications, AppNotification } from "@/contexts/notification-context"
import { useTheme } from "@/contexts/theme-context"
import { requestNotificationPermission, canShowNotifications } from "@/lib/notifications"

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [requestingPermission, setRequestingPermission] = useState(false)

  // Check notification permission status
  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotificationEnabled(canShowNotifications())
    }
  }, [])

  const handleEnableNotifications = async () => {
    setRequestingPermission(true)
    try {
      const permission = await requestNotificationPermission()
      setNotificationEnabled(permission === "granted")
      if (permission === "granted") {
        // Show a test notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Notifications Enabled", {
            body: "You'll now receive system notifications for new updates.",
            icon: "/icon-light-32x32.png",
          })
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error)
    } finally {
      setRequestingPermission(false)
    }
  }

  const getInitials = (username: string) => {
    return username
      .split(/[._-]/)
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await logout()
  }

  const getNotificationIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "feedback":
        return <MessageSquare className="w-4 h-4 text-amber-500" />
      case "comment":
        return <MessageSquare className="w-4 h-4 text-blue-500" />
      case "status_change":
        return <RefreshCw className="w-4 h-4 text-purple-500" />
      case "assignment":
        return <UserPlus className="w-4 h-4 text-green-500" />
      case "asset_uploaded":
        return <Upload className="w-4 h-4 text-cyan-500" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead([notification.id])
    }
    // Navigate to the related page
    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-6">
        <button onClick={onMenuClick} className="md:hidden text-muted-foreground hover:text-foreground">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <>
                    {/* Red dot indicator with pulse animation */}
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={markAllAsRead}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              
              {/* Notification Permission Prompt */}
              {!notificationEnabled && (
                <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs text-blue-800 mb-2">
                    Enable system notifications to get alerts even when the app is closed.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7 bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800"
                    onClick={handleEnableNotifications}
                    disabled={requestingPermission}
                  >
                    {requestingPermission ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mr-1" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <Bell className="w-3 h-3 mr-1" />
                        Enable Notifications
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <ScrollArea className="h-[320px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${
                          !notification.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!notification.read ? "font-semibold" : ""}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                            {notification.request && (
                              <span className="text-xs text-primary font-mono">
                                {notification.request.drmCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full text-sm h-8"
                      onClick={() => router.push("/dashboard/notifications")}
                    >
                      View all notifications
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}`} />
                  <AvatarFallback>{user ? getInitials(user.username) : "??"}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{user?.username || "User"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm">
                <div className="font-medium">{user?.username}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/profile")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
