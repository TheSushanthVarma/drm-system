"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import {
  User, Mail, Phone, Building, FileText, Save, Palette, ArrowRightLeft,
  CheckCircle2, AlertCircle, Clock, XCircle, Loader2
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"

interface ProfileData {
  id: string
  username: string
  email: string
  role: string
  status: string
  phone: string | null
  department: string | null
  bio: string | null
  createdAt: string
  lastLogin: string | null
}

interface RoleChangeRequest {
  id: string
  currentRole: string
  requestedRole: string
  status: string
  reason: string | null
  reviewNote: string | null
  createdAt: string
  reviewedBy: { id: string; username: string } | null
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    department: "",
    bio: "",
  })

  // Role change
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false)
  const [roleChangeRequests, setRoleChangeRequests] = useState<RoleChangeRequest[]>([])
  const [roleChangeReason, setRoleChangeReason] = useState("")
  const [submittingRoleChange, setSubmittingRoleChange] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchRoleChangeRequests()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile")
      const data = await res.json()
      if (data.success) {
        setProfile(data.user)
        setFormData({
          username: data.user.username || "",
          phone: data.user.phone || "",
          department: data.user.department || "",
          bio: data.user.bio || "",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleChangeRequests = async () => {
    try {
      const res = await fetch("/api/role-change-requests")
      const data = await res.json()
      if (data.success) {
        setRoleChangeRequests(data.requests)
      }
    } catch (error) {
      console.error("Error fetching role change requests:", error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.success) {
        setProfile(data.user)
        setSuccess("Profile updated successfully")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Failed to update profile")
      }
    } catch (err) {
      setError("An error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChangeSubmit = async () => {
    if (!profile) return
    setSubmittingRoleChange(true)
    setError("")

    const targetRole = profile.role === "designer" ? "requester" : "designer"

    try {
      const res = await fetch("/api/role-change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedRole: targetRole,
          reason: roleChangeReason.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setRoleChangeDialogOpen(false)
        setRoleChangeReason("")
        setSuccess("Role change request submitted! An admin will review it shortly.")
        setTimeout(() => setSuccess(""), 5000)
        fetchRoleChangeRequests()
      } else {
        setError(data.error || "Failed to submit role change request")
      }
    } catch (err) {
      setError("An error occurred")
    } finally {
      setSubmittingRoleChange(false)
    }
  }

  const getInitials = (username: string) => {
    return username
      .split(/[._\s-]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "designer":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-amber-500" />
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const hasPendingRequest = roleChangeRequests.some((r) => r.status === "pending")

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-muted-foreground">Could not load profile.</p>
      </div>
    )
  }

  const targetRole = profile.role === "designer" ? "Requester" : "Designer"

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      {/* Success / Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Role */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                />
                <AvatarFallback className="text-2xl">{getInitials(profile.username)}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{profile.username}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleBadgeClass(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
              <Separator className="my-4" />
              <div className="text-xs text-muted-foreground space-y-1 w-full text-left">
                <p>
                  <span className="font-medium">Member since:</span>{" "}
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
                {profile.lastLogin && (
                  <p>
                    <span className="font-medium">Last login:</span>{" "}
                    {new Date(profile.lastLogin).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Change Card */}
          {profile.role !== "admin" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Change Role</CardTitle>
                <CardDescription className="text-xs">
                  Request to switch to a different role. Requires admin approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setRoleChangeDialogOpen(true)}
                  disabled={hasPendingRequest}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {hasPendingRequest ? "Request Pending..." : `Switch to ${targetRole}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Edit Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details. All fields except email are editable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Display Name
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Your display name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  Department <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Marketing, Engineering"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Bio <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us a little about yourself..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Role Change History */}
          {roleChangeRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Role Change History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roleChangeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      {getStatusIcon(req.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium capitalize">
                            {req.currentRole} → {req.requestedRole}
                          </span>
                          <Badge
                            variant={
                              req.status === "approved"
                                ? "default"
                                : req.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        {req.reason && (
                          <p className="text-xs text-muted-foreground mt-1">Reason: {req.reason}</p>
                        )}
                        {req.reviewNote && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Admin note: {req.reviewNote}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(req.createdAt).toLocaleDateString()}
                          {req.reviewedBy && ` · Reviewed by ${req.reviewedBy.username}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Role Change</DialogTitle>
            <DialogDescription>
              You are requesting to change from{" "}
              <span className="font-semibold capitalize">{profile.role}</span> to{" "}
              <span className="font-semibold">{targetRole}</span>. An admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleBadgeClass(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeClass(targetRole.toLowerCase())}`}>
                  {targetRole}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={roleChangeReason}
                onChange={(e) => setRoleChangeReason(e.target.value)}
                placeholder="Why do you want to change your role?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleChangeSubmit}
              disabled={submittingRoleChange}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              {submittingRoleChange ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
