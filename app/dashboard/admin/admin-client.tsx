"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Search, MoreVertical, Users, Settings, Shield, CheckCircle2, AlertCircle,
  Loader2, UserCog, UserX, UserCheck, History, Eye, Download, FileText,
  Upload, Pencil, Inbox, Globe, Clock, Database, ToggleLeft, Hash
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"

// ─── Types ────────────────────────────────────────────────────
interface User {
  id: string
  username: string
  email: string
  role: string
  status: string
  lastLogin: string
  createdAt?: string
  requestsCreated?: number
  requestsAssigned?: number
}

interface AuditLog {
  id: number
  action: string
  targetType: string
  targetId: string | null
  details: any
  createdAt: string
  performedBy: { id: string; username: string; email: string }
}

interface SettingsMap {
  [key: string]: {
    value: string
    description: string | null
    updatedAt: string
    updatedBy: { id: string; username: string } | null
  }
}

interface AdminClientProps {
  onRefreshStats?: () => void
}

// ─── Permissions data ─────────────────────────────────────────
const permissionsData = [
  { name: "View Dashboard", category: "General", admin: true, designer: true, requester: true },
  { name: "View Own Profile", category: "General", admin: true, designer: true, requester: true },
  { name: "Change Theme", category: "General", admin: true, designer: true, requester: true },
  { name: "Reset Own Password", category: "General", admin: true, designer: true, requester: true },
  { name: "Create Design Requests", category: "Requests", admin: true, designer: false, requester: true },
  { name: "View All Requests", category: "Requests", admin: true, designer: true, requester: false },
  { name: "View Own Requests Only", category: "Requests", admin: false, designer: false, requester: true },
  { name: "Edit Any Request", category: "Requests", admin: true, designer: false, requester: false },
  { name: "Edit Own Drafts", category: "Requests", admin: true, designer: false, requester: true },
  { name: "Delete Requests", category: "Requests", admin: true, designer: false, requester: false },
  { name: "Assign Designers", category: "Requests", admin: true, designer: false, requester: false },
  { name: "Change Request Status", category: "Requests", admin: true, designer: true, requester: false },
  { name: "Upload Source Assets", category: "Assets", admin: true, designer: true, requester: false },
  { name: "Upload Final Deliverables", category: "Assets", admin: true, designer: true, requester: false },
  { name: "Download Source Assets", category: "Assets", admin: true, designer: true, requester: false },
  { name: "Download Final Assets", category: "Assets", admin: true, designer: true, requester: true },
  { name: "Create Catalogues", category: "Catalogues", admin: true, designer: false, requester: true },
  { name: "Edit/Delete Catalogues", category: "Catalogues", admin: true, designer: false, requester: true },
  { name: "View All Catalogues", category: "Catalogues", admin: true, designer: false, requester: true },
  { name: "View Admin Panel", category: "Admin", admin: true, designer: false, requester: false },
  { name: "Manage Users", category: "Admin", admin: true, designer: false, requester: false },
  { name: "Change User Roles", category: "Admin", admin: true, designer: false, requester: false },
  { name: "Activate/Deactivate Users", category: "Admin", admin: true, designer: false, requester: false },
  { name: "Review Role Change Requests", category: "Admin", admin: true, designer: false, requester: false },
  { name: "Manage System Settings", category: "Admin", admin: true, designer: false, requester: false },
  { name: "View Audit Logs", category: "Admin", admin: true, designer: false, requester: false },
  { name: "Publish Designs", category: "Publishing", admin: true, designer: false, requester: true },
  { name: "Mark Ready to Publish", category: "Publishing", admin: true, designer: true, requester: false },
  { name: "Request Role Change", category: "Account", admin: false, designer: true, requester: true },
]

// ─── Settings config ──────────────────────────────────────────
const settingsConfig: {
  key: string
  label: string
  icon: any
  type: "text" | "number" | "boolean" | "select"
  options?: { value: string; label: string }[]
  category: string
}[] = [
  { key: "allowed_email_domains", label: "Allowed Email Domains", icon: Globe, type: "text", category: "Registration" },
  { key: "allow_self_registration", label: "Allow Self Registration", icon: UserCheck, type: "boolean", category: "Registration" },
  { key: "default_user_role", label: "Default User Role", icon: UserCog, type: "select", options: [
    { value: "requester", label: "Requester" },
    { value: "designer", label: "Designer" },
  ], category: "Registration" },
  { key: "require_email_verification", label: "Require Email Verification", icon: CheckCircle2, type: "boolean", category: "Registration" },
  { key: "max_upload_size_mb", label: "Max Upload Size (MB)", icon: Upload, type: "number", category: "Limits" },
  { key: "max_requests_per_user", label: "Max Requests Per User (0=unlimited)", icon: Hash, type: "number", category: "Limits" },
  { key: "auto_archive_days", label: "Auto-Archive After (days)", icon: Database, type: "number", category: "Automation" },
  { key: "session_timeout_hours", label: "Session Timeout (hours)", icon: Clock, type: "number", category: "Security" },
  { key: "maintenance_mode", label: "Maintenance Mode", icon: ToggleLeft, type: "boolean", category: "System" },
]

// ─── Main Component ───────────────────────────────────────────
export function AdminClient({ onRefreshStats }: AdminClientProps) {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<"users" | "settings" | "permissions" | "audit">("users")

  // ─── Users state ──────────────────
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // User action dialogs
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "role" | "status" | "edit"
    user: User | null
  }>({ open: false, type: "role", user: null })
  const [actionValue, setActionValue] = useState("")
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState("")
  const [actionSuccess, setActionSuccess] = useState("")

  // ─── Settings state ───────────────
  const [settings, setSettings] = useState<SettingsMap>({})
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsEdited, setSettingsEdited] = useState<Record<string, string>>({})
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState("")
  const [settingsError, setSettingsError] = useState("")

  // ─── Audit state ──────────────────
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditTotal, setAuditTotal] = useState(0)

  // ─── Load data ────────────────────
  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (activeTab === "settings" && Object.keys(settings).length === 0) {
      fetchSettings()
    }
    if (activeTab === "audit" && auditLogs.length === 0) {
      fetchAuditLogs()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      if (data.success) {
        setUsers(
          data.users.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            status: u.status,
            lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never",
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
            requestsCreated: u._count?.requestsCreated || 0,
            requestsAssigned: u._count?.requestsAssigned || 0,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchSettings = async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const res = await fetch("/api/admin/audit-logs?limit=50")
      const data = await res.json()
      if (data.success) {
        setAuditLogs(data.logs)
        setAuditTotal(data.pagination.total)
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setAuditLoading(false)
    }
  }

  // ─── User Actions ─────────────────
  const handleUserAction = async () => {
    if (!actionDialog.user) return
    setActionSubmitting(true)
    setActionError("")

    try {
      let body: any = {}

      switch (actionDialog.type) {
        case "role":
          body = { action: "change_role", role: actionValue }
          break
        case "status":
          body = {
            action: "change_status",
            status: actionDialog.user.status === "active" ? "inactive" : "active",
          }
          break
        case "edit":
          body = { action: "edit_user", username: actionValue }
          break
      }

      const res = await fetch(`/api/users/${actionDialog.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        setActionDialog({ open: false, type: "role", user: null })
        setActionValue("")
        setActionSuccess(
          actionDialog.type === "role"
            ? `Role changed to ${actionValue}`
            : actionDialog.type === "status"
            ? `User ${actionDialog.user.status === "active" ? "deactivated" : "activated"}`
            : "User updated"
        )
        setTimeout(() => setActionSuccess(""), 4000)
        fetchUsers()
        onRefreshStats?.()
        if (activeTab === "audit" || auditLogs.length > 0) fetchAuditLogs()
      } else {
        setActionError(data.error || "Failed to update user")
      }
    } catch (err) {
      setActionError("An error occurred")
    } finally {
      setActionSubmitting(false)
    }
  }

  const openRoleDialog = (user: User) => {
    setActionValue(user.role)
    setActionError("")
    setActionDialog({ open: true, type: "role", user })
  }

  const openStatusDialog = (user: User) => {
    setActionError("")
    setActionDialog({ open: true, type: "status", user })
  }

  const openEditDialog = (user: User) => {
    setActionValue(user.username)
    setActionError("")
    setActionDialog({ open: true, type: "edit", user })
  }

  // ─── Settings Actions ─────────────
  const getSettingValue = (key: string) => {
    if (key in settingsEdited) return settingsEdited[key]
    return settings[key]?.value || ""
  }

  const setSettingValue = (key: string, value: string) => {
    setSettingsEdited((prev) => ({ ...prev, [key]: value }))
  }

  const hasSettingsChanges = Object.keys(settingsEdited).some(
    (key) => settingsEdited[key] !== settings[key]?.value
  )

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError("")
    setSettingsSuccess("")

    // Only send changed values
    const changed: Record<string, string> = {}
    for (const [key, value] of Object.entries(settingsEdited)) {
      if (value !== settings[key]?.value) {
        changed[key] = value
      }
    }

    if (Object.keys(changed).length === 0) {
      setSettingsSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: changed }),
      })

      const data = await res.json()
      if (data.success) {
        setSettingsEdited({})
        setSettingsSuccess(data.message || "Settings saved")
        setTimeout(() => setSettingsSuccess(""), 4000)
        fetchSettings()
        if (auditLogs.length > 0) fetchAuditLogs()
      } else {
        setSettingsError(data.error || "Failed to save settings")
      }
    } catch (err) {
      setSettingsError("An error occurred")
    } finally {
      setSettingsSaving(false)
    }
  }

  // ─── Filter users ─────────────────
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  // ─── Helpers ──────────────────────
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "designer": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default: return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    }
  }

  const formatAuditAction = (action: string) => {
    const map: Record<string, string> = {
      "user.role_changed": "Changed Role",
      "user.activated": "Activated User",
      "user.deactivated": "Deactivated User",
      "user.edited": "Edited User",
      "settings.updated": "Updated Settings",
    }
    return map[action] || action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const tabs = [
    { id: "users" as const, label: "Users", icon: Users, count: users.length },
    { id: "settings" as const, label: "Settings", icon: Settings },
    { id: "permissions" as const, label: "Permissions", icon: Shield },
    { id: "audit" as const, label: "Audit Log", icon: History, count: auditTotal || undefined },
  ]

  return (
    <>
      {/* Global Success Message */}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {tab.count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* ═══════════ USERS TAB ═══════════ */}
      {activeTab === "users" && (
        <>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="requester">Requester</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} of {users.length} users
                {(roleFilter !== "all" || statusFilter !== "all" || searchQuery) && " (filtered)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow className="hover:bg-muted">
                        <TableHead className="font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Joined</TableHead>
                        <TableHead className="font-semibold">Last Login</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className={`hover:bg-muted/50 transition-colors ${
                            user.status === "inactive" ? "opacity-60" : ""
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                />
                                <AvatarFallback>
                                  {user.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{user.username}</span>
                                {user.id === currentUser?.id && (
                                  <Badge variant="outline" className="ml-2 text-[10px] py-0">
                                    You
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeClass(user.role)}`}
                            >
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === "active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === "active" ? "bg-green-500" : "bg-gray-400"
                                }`}
                              />
                              {user.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.createdAt}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.lastLogin}
                          </TableCell>
                          <TableCell>
                            {user.id !== currentUser?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(user)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Edit Username
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRoleDialog(user)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <UserCog className="w-4 h-4" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openStatusDialog(user)}
                                    className={`gap-2 cursor-pointer ${
                                      user.status === "active"
                                        ? "text-destructive focus:text-destructive"
                                        : "text-green-600 focus:text-green-600"
                                    }`}
                                  >
                                    {user.status === "active" ? (
                                      <>
                                        <UserX className="w-4 h-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-4 h-4" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found matching your filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════ SETTINGS TAB ═══════════ */}
      {activeTab === "settings" && (
        <>
          {settingsSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}
          {settingsError && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}

          {settingsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Group settings by category */}
              {["Registration", "Limits", "Automation", "Security", "System"].map((category) => {
                const categorySettings = settingsConfig.filter((s) => s.category === category)
                if (categorySettings.length === 0) return null

                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-base">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {categorySettings.map((config) => {
                        const Icon = config.icon
                        const currentValue = getSettingValue(config.key)
                        const isChanged = config.key in settingsEdited && settingsEdited[config.key] !== settings[config.key]?.value

                        return (
                          <div
                            key={config.key}
                            className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border ${
                              isChanged ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-3 sm:w-72 flex-shrink-0">
                              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{config.label}</p>
                                {settings[config.key]?.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {settings[config.key].description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              {config.type === "boolean" ? (
                                <button
                                  onClick={() =>
                                    setSettingValue(
                                      config.key,
                                      currentValue === "true" ? "false" : "true"
                                    )
                                  }
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                    currentValue === "true"
                                      ? "bg-primary"
                                      : "bg-muted-foreground/30"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                      currentValue === "true" ? "translate-x-6" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              ) : config.type === "select" ? (
                                <Select
                                  value={currentValue}
                                  onValueChange={(v) => setSettingValue(config.key, v)}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {config.options?.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : config.type === "number" ? (
                                <Input
                                  type="number"
                                  value={currentValue}
                                  onChange={(e) => setSettingValue(config.key, e.target.value)}
                                  className="w-32"
                                  min={0}
                                />
                              ) : (
                                <Input
                                  value={currentValue}
                                  onChange={(e) => setSettingValue(config.key, e.target.value)}
                                  className="max-w-md"
                                />
                              )}
                            </div>
                            {isChanged && (
                              <Badge variant="outline" className="text-xs text-primary border-primary">
                                Modified
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}

              {/* Save bar */}
              {hasSettingsChanges && (
                <div className="sticky bottom-4 z-20">
                  <Card className="border-primary shadow-lg">
                    <CardContent className="pt-4 pb-4 flex items-center justify-between">
                      <p className="text-sm font-medium">
                        You have unsaved changes ({Object.keys(settingsEdited).filter(k => settingsEdited[k] !== settings[k]?.value).length} setting(s))
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettingsEdited({})}
                        >
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveSettings}
                          disabled={settingsSaving}
                          className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
                        >
                          {settingsSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Save Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════════ PERMISSIONS TAB ═══════════ */}
      {activeTab === "permissions" && (
        <Card>
          <CardHeader>
            <CardTitle>Role-Based Access Control (RBAC) Matrix</CardTitle>
            <CardDescription>
              Complete overview of permissions for each role. These are system-enforced and cannot be
              modified per-user — they apply uniformly to everyone with the role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left font-semibold py-3 px-4 w-64">Permission</th>
                    <th className="text-center font-semibold py-3 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass("admin")}`}>
                          Admin
                        </span>
                      </div>
                    </th>
                    <th className="text-center font-semibold py-3 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass("designer")}`}>
                          Designer
                        </span>
                      </div>
                    </th>
                    <th className="text-center font-semibold py-3 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass("requester")}`}>
                          Requester
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Group by category */}
                  {["General", "Requests", "Assets", "Catalogues", "Publishing", "Account", "Admin"].map(
                    (category) => {
                      const categoryPerms = permissionsData.filter((p) => p.category === category)
                      if (categoryPerms.length === 0) return null

                      return (
                        <Fragment key={category}>
                          <tr>
                            <td
                              colSpan={4}
                              className="pt-4 pb-1 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/50"
                            >
                              {category}
                            </td>
                          </tr>
                          {categoryPerms.map((perm) => (
                            <tr
                              key={perm.name}
                              className="border-b border-border hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-2.5 px-4 font-medium">{perm.name}</td>
                              <td className="text-center py-2.5 px-4">
                                {perm.admin ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full">
                                    <span className="text-gray-400 text-xs">✗</span>
                                  </span>
                                )}
                              </td>
                              <td className="text-center py-2.5 px-4">
                                {perm.designer ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full">
                                    <span className="text-gray-400 text-xs">✗</span>
                                  </span>
                                )}
                              </td>
                              <td className="text-center py-2.5 px-4">
                                {perm.requester ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full">
                                    <span className="text-gray-400 text-xs">✗</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>

            <Separator className="my-6" />

            {/* Permission Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  role: "Admin",
                  color: getRoleBadgeClass("admin"),
                  count: permissionsData.filter((p) => p.admin).length,
                  desc: "Full system access. Can manage users, settings, and all content.",
                },
                {
                  role: "Designer",
                  color: getRoleBadgeClass("designer"),
                  count: permissionsData.filter((p) => p.designer).length,
                  desc: "Can view all requests, upload assets, and change request status.",
                },
                {
                  role: "Requester",
                  color: getRoleBadgeClass("requester"),
                  count: permissionsData.filter((p) => p.requester).length,
                  desc: "Can create requests, manage catalogues, and download final assets.",
                },
              ].map((item) => (
                <Card key={item.role}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.color}`}>
                        {item.role}
                      </span>
                      <span className="text-sm font-semibold">
                        {item.count}/{permissionsData.length} permissions
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ AUDIT LOG TAB ═══════════ */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Audit Trail
            </CardTitle>
            <CardDescription>
              Track all administrative actions for compliance and accountability
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No audit logs yet</p>
                <p className="text-xs mt-1">Admin actions will be recorded here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {formatAuditAction(log.action)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.targetType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By <span className="font-medium">{log.performedBy.username}</span>
                        {log.details?.targetUsername && (
                          <> on <span className="font-medium">{log.details.targetUsername}</span></>
                        )}
                      </p>
                      {log.details && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.details.previousRole && log.details.newRole && (
                            <span>
                              {log.details.previousRole} → {log.details.newRole}
                            </span>
                          )}
                          {log.details.previousStatus && log.details.newStatus && (
                            <span>
                              {log.details.previousStatus} → {log.details.newStatus}
                            </span>
                          )}
                          {log.details.updatedKeys && (
                            <span>Keys: {log.details.updatedKeys.join(", ")}</span>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════ ACTION DIALOGS ═══════════ */}

      {/* Change Role Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "role"}
        onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for <span className="font-semibold">{actionDialog.user?.username}</span>.
              This takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Role</label>
              <Select value={actionValue} onValueChange={setActionValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full system access</SelectItem>
                  <SelectItem value="designer">Designer — Design and upload assets</SelectItem>
                  <SelectItem value="requester">Requester — Create and track requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {actionValue === "admin" && (
              <div className="flex items-center gap-2 p-3 text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Admin role grants full system access including user management.</span>
              </div>
            )}
            {actionError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleUserAction}
              disabled={actionSubmitting || actionValue === actionDialog.user?.role}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              {actionSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "status"}
        onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.user?.status === "active" ? "Deactivate" : "Activate"} User
            </DialogTitle>
            <DialogDescription>
              {actionDialog.user?.status === "active"
                ? `This will prevent ${actionDialog.user?.username} from logging in. They will be signed out on their next request.`
                : `This will restore ${actionDialog.user?.username}'s access to the system.`}
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleUserAction}
              disabled={actionSubmitting}
              variant={actionDialog.user?.status === "active" ? "destructive" : "default"}
              className={
                actionDialog.user?.status !== "active"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }
            >
              {actionSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionDialog.user?.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "edit"}
        onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for <span className="font-semibold">{actionDialog.user?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            {actionError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleUserAction}
              disabled={actionSubmitting || !actionValue.trim()}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              {actionSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Fragment import needed for JSX grouping
import { Fragment } from "react"
