"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Inbox, Settings, Users, X, Plus, Folder, ArrowRightLeft } from "lucide-react"
import { useAuth, usePermissions } from "@/contexts/auth-context"

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const { user, isAdmin, isDesigner, isRequester } = useAuth()
  const permissions = usePermissions()

  // Build navigation items based on role
  const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/dashboard/catalogues", label: "Catalogues", icon: Folder, show: permissions.canCreateRequest || isAdmin },
    { href: "/dashboard/requests", label: "All Requests", icon: Inbox, show: permissions.canViewAllRequests },
    { href: "/dashboard/requests", label: "Requests", icon: Inbox, show: isRequester },
    { href: "/dashboard/requests/new", label: "New Request", icon: Plus, show: permissions.canCreateRequest },
    { href: "/dashboard/admin", label: "Admin Panel", icon: Users, show: permissions.canViewAdminPanel },
    { href: "/dashboard/admin/role-requests", label: "Role Requests", icon: ArrowRightLeft, show: isAdmin },
  ].filter(item => item.show)

  // Get role display name and badge color
  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", className: "bg-red-100 text-red-700" }
    if (isDesigner) return { label: "Designer", className: "bg-blue-100 text-blue-700" }
    return { label: "Requester", className: "bg-green-100 text-green-700" }
  }

  const roleBadge = getRoleBadge()

  return (
    <>
      {open && <div className="fixed inset-0 z-40 md:hidden bg-black/50" onClick={() => onOpenChange(false)} />}

      <aside
        className={cn(
          "fixed md:relative w-64 h-screen bg-card border-r border-border transition-all z-40",
          !open && "hidden md:block",
        )}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">DR</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">DRM</h1>
              <p className="text-xs text-muted-foreground">Design Management</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-medium truncate">{user.username}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", roleBadge.className)}>
                {roleBadge.label}
              </span>
            </div>
          </div>
        )}

        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href === "/dashboard/requests" && pathname.startsWith("/dashboard/requests") && item.label !== "New Request") ||
              (item.href === "/dashboard/catalogues" && pathname.startsWith("/dashboard/catalogues")) ||
              (item.href === "/dashboard/admin" && item.label === "Admin Panel" && pathname === "/dashboard/admin") ||
              (item.href === "/dashboard/admin/role-requests" && pathname === "/dashboard/admin/role-requests")
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
