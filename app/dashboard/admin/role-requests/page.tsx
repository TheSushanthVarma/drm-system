"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import {
  ArrowRightLeft, CheckCircle2, XCircle, Clock, ShieldAlert, Loader2, AlertCircle, ArrowRight
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"

interface RoleChangeRequest {
  id: string
  currentRole: string
  requestedRole: string
  status: string
  reason: string | null
  reviewNote: string | null
  createdAt: string
  user: {
    id: string
    username: string
    email: string
    role: string
  }
  reviewedBy: { id: string; username: string } | null
}

export default function RoleRequestsPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<RoleChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RoleChangeRequest | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [reviewNote, setReviewNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!isAdmin && user) {
      router.push("/dashboard")
      return
    }
    fetchRequests()
  }, [isAdmin, user, router])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/role-change-requests")
      const data = await res.json()
      if (data.success) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error("Error fetching role change requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const openActionDialog = (request: RoleChangeRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setActionType(action)
    setReviewNote("")
    setError("")
    setActionDialogOpen(true)
  }

  const handleAction = async () => {
    if (!selectedRequest) return
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/role-change-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reviewNote: reviewNote.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setActionDialogOpen(false)
        setSuccess(
          actionType === "approve"
            ? `Role change approved for ${selectedRequest.user.username}`
            : `Role change rejected for ${selectedRequest.user.username}`
        )
        setTimeout(() => setSuccess(""), 5000)
        fetchRequests()
      } else {
        setError(data.error || "Failed to process request")
      }
    } catch (err) {
      setError("An error occurred")
    } finally {
      setSubmitting(false)
    }
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

  if (!isAdmin && !loading) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only admins can manage role change requests.</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-6">
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const pendingRequests = requests.filter((r) => r.status === "pending")
  const resolvedRequests = requests.filter((r) => r.status !== "pending")

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Change Requests</h1>
        <p className="text-muted-foreground">
          Review and manage role change requests from users
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingRequests.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                These requests need your review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.username}`}
                        />
                        <AvatarFallback>
                          {req.user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{req.user.username}</span>
                          <span className="text-xs text-muted-foreground">{req.user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeClass(req.currentRole)}`}
                          >
                            {req.currentRole}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeClass(req.requestedRole)}`}
                          >
                            {req.requestedRole}
                          </span>
                        </div>
                        {req.reason && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Reason:</span> {req.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => openActionDialog(req, "approve")}
                          className="bg-green-600 hover:bg-green-700 text-white gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openActionDialog(req, "reject")}
                          className="gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolved Requests */}
          {resolvedRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
                <CardDescription>Previously reviewed requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resolvedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      {getStatusIcon(req.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{req.user.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {req.currentRole} → {req.requestedRole}
                          </span>
                          <Badge
                            variant={req.status === "approved" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        {req.reviewNote && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: {req.reviewNote}
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
        </>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Role Change
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {actionType === "approve"
                    ? `This will change ${selectedRequest.user.username}'s role from ${selectedRequest.currentRole} to ${selectedRequest.requestedRole}.`
                    : `This will reject ${selectedRequest.user.username}'s request to become a ${selectedRequest.requestedRole}. They will remain as ${selectedRequest.currentRole}.`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Note <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Any notes for the user..."
                    : "Reason for rejection..."
                }
                rows={3}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
