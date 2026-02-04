"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, Download, Share2, MoreVertical, Send, Clock, CheckCircle2, Upload, FileIcon, Image, File, AlertCircle, Link2, RefreshCw, ArrowRight, MessageSquare, ThumbsUp, Copy, Package } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth, usePermissions } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { AssignDesignerDialog } from "@/components/assign-designer-dialog"
import { NewRequestDrawer } from "@/components/new-request-drawer"

type TabType = "overview" | "assets" | "feedback" | "publications"

interface RequestData {
  id: string
  drmCode: string
  name: string
  description: string | null
  referenceLink: string | null
  catalogue: { id: string; name: string } | null
  status: string
  priority: string
  dueDate: string | null
  publishedLink: string | null
  publishedAt: string | null
  createdAt: string
  requester: { id: number; username: string; email: string }
  designer: { id: number; username: string; email: string } | null
  comments: Array<{
    id: number
    content: string
    createdAt: string
    author: { id: number; username: string; role: string }
  }>
  assets: Array<{
    id: number
    filename: string
    fileUrl: string
    fileType: string
    fileSize: number
    assetType: "source" | "final"
    version: number
    versionNote: string | null
    createdAt: string
    uploadedBy: { id: number; username: string }
  }>
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [feedbackText, setFeedbackText] = useState("")
  const [request, setRequest] = useState<RequestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadData, setUploadData] = useState({
    filename: "",
    fileUrl: "",
    assetType: "source" as "source" | "final",
    versionNote: "",
  })
  const [uploading, setUploading] = useState(false)
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishedLink, setPublishedLink] = useState("")
  const [cloneDrawerOpen, setCloneDrawerOpen] = useState(false)
  
  const { user } = useAuth()
  const permissions = usePermissions()
  const { fetchNotifications } = useNotifications()

  // Initial fetch
  useEffect(() => {
    fetchRequest()
  }, [resolvedParams.id])

  // Polling for real-time updates (comments, status changes)
  useEffect(() => {
    if (!request) return

    // Fetch only status for real-time workflow progress updates
    const fetchStatusOnly = async () => {
      try {
        const res = await fetch(`/api/requests/${resolvedParams.id}`)
        const data = await res.json()
        if (data.success && data.request) {
          // Only update if status has changed
          setRequest(prev => {
            if (!prev || prev.status === data.request.status) return prev
            return {
              ...prev, 
              status: data.request.status,
              publishedLink: data.request.publishedLink,
              publishedAt: data.request.publishedAt
            }
          })
        }
      } catch (err) {
        // Silent fail for polling - don't disrupt user experience
        console.error("Status polling error:", err)
      }
    }

    const pollInterval = setInterval(() => {
      fetchCommentsOnly()
      fetchStatusOnly()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [request?.id, resolvedParams.id])

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${resolvedParams.id}`)
      const data = await res.json()
      if (data.success) {
        setRequest(data.request)
      } else {
        setError(data.error || "Failed to load request")
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setError("Failed to load request")
    } finally {
      setLoading(false)
    }
  }

  // Fetch only comments for real-time updates without full page refresh
  const fetchCommentsOnly = async () => {
    if (!request) return
    try {
      const res = await fetch(`/api/requests/${resolvedParams.id}/comments`)
      const data = await res.json()
      if (data.success && data.comments) {
        // Only update if there are new comments
        if (data.comments.length !== request.comments.length) {
          setRequest(prev => prev ? { ...prev, comments: data.comments } : null)
        }
      }
    } catch (err) {
      // Silent fail for polling - don't disrupt user experience
      console.error("Polling error:", err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadData({ ...uploadData, filename: file.name })
    }
  }

  const handleUploadAsset = async () => {
    // Validate based on upload mode
    if (uploadMode === "file" && !selectedFile) {
      setError("Please select a file to upload")
      return
    }
    if (uploadMode === "url" && (!uploadData.filename || !uploadData.fileUrl)) {
      setError("Please provide filename and URL")
      return
    }

    setUploading(true)
    setError("")
    
    try {
      let fileUrl = uploadData.fileUrl
      let filename = uploadData.filename
      let fileType = getFileType(filename)
      let fileSize = 0

      // If uploading a file, first upload it to the server
      if (uploadMode === "file" && selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("requestId", resolvedParams.id)

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const uploadData_result = await uploadRes.json()
        if (!uploadData_result.success) {
          setError(uploadData_result.error || "Failed to upload file")
          setUploading(false)
          return
        }

        fileUrl = uploadData_result.file.fileUrl
        filename = uploadData_result.file.filename
        fileType = uploadData_result.file.fileType
        fileSize = uploadData_result.file.fileSize
      }

      // Create the asset record
      const res = await fetch(`/api/requests/${resolvedParams.id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          fileUrl,
          fileType,
          fileSize,
          assetType: uploadData.assetType,
          versionNote: uploadData.versionNote,
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Refresh request data
        fetchRequest()
        setUploadDialogOpen(false)
        setUploadData({ filename: "", fileUrl: "", assetType: "source", versionNote: "" })
        setSelectedFile(null)
        setUploadMode("file")
      } else {
        setError(data.error || "Failed to save asset")
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload asset")
    } finally {
      setUploading(false)
    }
  }

  const getFileType = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      psd: "application/vnd.adobe.photoshop",
      ai: "application/illustrator",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      mp4: "video/mp4",
      mov: "video/quicktime",
    }
    return mimeTypes[ext || ""] || "application/octet-stream"
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "Unknown size"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Get workflow stages based on current status
  const getWorkflowStages = (status: string) => {
    // Main workflow path (changes_requested loops back to in_design)
    // completed is an alternative to ready_to_publish
    const mainStages = [
      "draft", "submitted", "assigned", "in_design", "in_review", "ready_to_publish", "published"
    ]
    const stageLabels: Record<string, string> = {
      draft: "Draft",
      submitted: "Submitted",
      assigned: "Assigned",
      in_design: "In Design",
      in_review: "In Review",
      changes_requested: "Changes Requested",
      ready_to_publish: "Ready to Publish",
      completed: "Completed",
      published: "Published",
    }

    // Handle alternative paths
    let effectiveStatus = status
    if (status === "completed") {
      effectiveStatus = "ready_to_publish" // completed is equivalent to ready_to_publish in workflow
    }
    if (status === "changes_requested") {
      effectiveStatus = "in_review" // changes_requested is a loop from in_review
    }
    
    const currentIndex = mainStages.indexOf(effectiveStatus)
    return mainStages.map((stage, index) => ({
      name: stage === "ready_to_publish" && status === "completed" ? "Completed" : stageLabels[stage],
      key: stage === "ready_to_publish" && status === "completed" ? "completed" : stage,
      completed: index < currentIndex,
      current: index === currentIndex || (stage === "ready_to_publish" && status === "completed"),
      isAlternate: status === "changes_requested" && stage === "in_review",
    }))
  }

  // Get available status transitions based on current status and role
  const getAvailableStatusTransitions = () => {
    if (!request) return []
    
    const statusTransitions: Record<string, Record<string, string[]>> = {
      admin: {
        draft: ["submitted", "archived"],
        submitted: ["assigned", "archived"],
        assigned: ["in_design", "submitted", "archived"],
        in_design: ["in_review", "assigned", "archived"],
        in_review: ["changes_requested", "ready_to_publish", "in_design", "archived"],
        changes_requested: ["in_design", "archived"],
        ready_to_publish: ["published", "in_review", "archived"],
        published: ["archived"],
        archived: ["draft"],
      },
      designer: {
        assigned: ["in_design"],
        in_design: ["in_review"],
        in_review: ["ready_to_publish", "changes_requested"], // Removed "completed" option
        changes_requested: ["in_design"],
        // After ready_to_publish, designer cannot change - it's requester's turn
      },
      requester: {
        draft: ["submitted"],
        ready_to_publish: ["published", "changes_requested"], // Requester can publish or request more changes
      },
    }

    const role = user?.role || "requester"
    const currentStatus = request.status
    const transitions = statusTransitions[role]?.[currentStatus] || []

    const statusLabels: Record<string, { label: string; description: string; color: string; requiresLink?: boolean }> = {
      draft: { label: "Draft", description: "Save as draft", color: "bg-gray-100 text-gray-700" },
      submitted: { label: "Submitted", description: "Submit for review", color: "bg-blue-100 text-blue-700" },
      assigned: { label: "Assigned", description: "Assign to designer", color: "bg-purple-100 text-purple-700" },
      in_design: { label: "In Design", description: "Continue designing", color: "bg-yellow-100 text-yellow-700" },
      in_review: { label: "In Review", description: "Submit for review", color: "bg-orange-100 text-orange-700" },
      changes_requested: { label: "Request Changes", description: "Ask for revisions", color: "bg-red-100 text-red-700" },
      ready_to_publish: { label: "Accept & Ready to Publish", description: "Design looks good! Accept and get ready to publish", color: "bg-green-100 text-green-700" },
      published: { label: "Publish", description: "Mark as published (requires link)", color: "bg-teal-100 text-teal-700", requiresLink: true },
      archived: { label: "Archive", description: "Archive this request", color: "bg-slate-100 text-slate-700" },
    }

    return transitions.map(status => ({
      status,
      ...statusLabels[status],
    }))
  }

  const handleStatusUpdate = async (newStatus: string, link?: string) => {
    if (!request) return

    // For published status, open the publish dialog instead
    if (newStatus === "published" && !link) {
      setStatusDialogOpen(false)
      setPublishDialogOpen(true)
      return
    }

    setUpdatingStatus(true)
    setError("")

    try {
      const body: any = { status: newStatus }
      if (newStatus === "published" && link) {
        body.publishedLink = link
      }

      const res = await fetch(`/api/requests/${request.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        // Update request status immediately without full reload
        setRequest(prev => prev ? {
          ...prev,
          status: data.request.status,
          publishedLink: data.request.publishedLink || prev.publishedLink,
          publishedAt: data.request.publishedAt || prev.publishedAt
        } : null)
        setStatusDialogOpen(false)
        setPublishDialogOpen(false)
        setPublishedLink("")
        // Optionally fetch full request to ensure all data is in sync
        fetchRequest()
      } else {
        setError(data.error || "Failed to update status")
      }
    } catch (err) {
      console.error("Status update error:", err)
      setError("Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handlePublish = async () => {
    if (!publishedLink.trim()) {
      setError("Please enter the published link")
      return
    }
    await handleStatusUpdate("published", publishedLink.trim())
  }

  const handleSubmitComment = async () => {
    if (!request || !feedbackText.trim()) return

    setSubmittingComment(true)
    setError("")

    try {
      const res = await fetch(`/api/requests/${request.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: feedbackText.trim() }),
      })

      const data = await res.json()
      if (data.success) {
        setFeedbackText("")
        fetchRequest() // Refresh to get the new comment
        // Trigger notification refresh for the recipient to see the notification faster
        fetchNotifications()
      } else {
        setError(data.error || "Failed to add comment")
      }
    } catch (err) {
      console.error("Comment submission error:", err)
      setError("Failed to add comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error || "Request not found"}</p>
          <Link href="/dashboard/requests">
            <Button>Back to Requests</Button>
          </Link>
        </div>
      </div>
    )
  }

  const workflowStages = getWorkflowStages(request.status)
  const isRequester = user?.role === "requester"
  const isDesigner = user?.role === "designer"
  const isAdmin = user?.role === "admin"
  const canUploadAssets = permissions.canUploadAssets && (isAdmin || request.designer?.id === user?.id)

  // Filter assets based on role - requesters only see final assets
  const visibleAssets = isRequester 
    ? request.assets.filter(a => a.assetType === "final")
    : request.assets

  const sourceAssets = visibleAssets.filter(a => a.assetType === "source")
  const finalAssets = visibleAssets.filter(a => a.assetType === "final")

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{request.name}</h1>
            <span className="font-mono text-lg text-primary font-semibold">{request.drmCode}</span>
            {request.catalogue && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-muted text-sm font-medium">
                <Package className="w-4 h-4" />
                {request.catalogue.name}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Created on {formatDate(request.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
        </div>
        {(isAdmin || isDesigner || isRequester) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
              {isAdmin && <DropdownMenuItem>Edit Request</DropdownMenuItem>}
              {(isAdmin || (isDesigner && !request.designer)) && (
                <DropdownMenuItem onClick={() => setAssignDialogOpen(true)}>
                  {isDesigner ? "Assign to Myself" : "Assign Designer"}
                </DropdownMenuItem>
              )}
              {isRequester && request.requester.id === user?.id && (
                <>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      setCloneDrawerOpen(true)
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Clone Request
                  </DropdownMenuItem>
                  <NewRequestDrawer
                    mode="clone"
                    open={cloneDrawerOpen}
                    onOpenChange={setCloneDrawerOpen}
                    onCreated={() => {
                      setCloneDrawerOpen(false)
                      // Optionally refresh the page or show a success message
                    }}
                    initialValues={{
                      requestName: `${request.name} (Copy)`,
                      description: request.description || "",
                      priority: request.priority,
                      dueDate: request.dueDate ? (() => {
                        const date = new Date(request.dueDate)
                        return !isNaN(date.getTime()) ? format(date, "ddMMyyyy") : ""
                      })() : "",
                      catalogueId: request.catalogue?.id || "",
                    }}
                  />
                </>
              )}
              <DropdownMenuItem>Share</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
        
        {/* Assign Designer Dialog */}
        <AssignDesignerDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          requestId={request.id}
          requestName={request.name}
          currentDesignerId={request.designer?.id}
          onAssigned={fetchRequest}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="assets" className="relative">
                <span className="flex items-center gap-2">
                  Assets {visibleAssets.length > 0 && `(${visibleAssets.length})`}
                  {/* Green dot indicator for requester when designer has uploaded files */}
                  {isRequester && finalAssets.length > 0 && (
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger value="feedback">
                Feedback {request.comments.length > 0 && `(${request.comments.length})`}
              </TabsTrigger>
              <TabsTrigger value="publications">Publications</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Requester</p>
                      <p className="font-semibold">{request.requester.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Designer</p>
                      <p className="font-semibold">{request.designer?.username || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Priority</p>
                      <p className="font-semibold capitalize">{request.priority.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                      <p className="font-semibold">{request.dueDate ? formatDate(request.dueDate) : "Not set"}</p>
                    </div>
                    {request.catalogue && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Catalogue</p>
                        <p className="font-semibold inline-flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {request.catalogue.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.description && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-foreground whitespace-pre-wrap">{request.description}</p>
                    </div>
                  )}

                  {request.referenceLink && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Reference Link</p>
                      <a 
                        href={request.referenceLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 hover:underline font-medium inline-flex items-center gap-1"
                        title={request.referenceLink}
                      >
                        {request.referenceLink.length > 60 
                          ? `${request.referenceLink.substring(0, 60)}...` 
                          : request.referenceLink
                        }
                        <Link2 className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {request.publishedLink && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Published Link</p>
                      <a 
                        href={request.publishedLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 hover:underline font-medium inline-flex items-center gap-1"
                        title={request.publishedLink}
                      >
                        {request.publishedLink.length > 60 
                          ? `${request.publishedLink.substring(0, 60)}...` 
                          : request.publishedLink
                        }
                        <Link2 className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assets Tab */}
            <TabsContent value="assets" className="space-y-4 mt-6">
              {/* Final Assets Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Final Deliverables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finalAssets.length > 0 ? (
              <div className="space-y-3">
                      {finalAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getFileIcon(asset.fileType)}
                            <div>
                              <p className="font-medium">{asset.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                v{asset.version} • {formatFileSize(asset.fileSize)} • by {asset.uploadedBy?.username || "Unknown"}
                              </p>
                              {asset.versionNote && (
                                <p className="text-xs text-green-700 mt-1">{asset.versionNote}</p>
                              )}
                      </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="text-green-700" title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                            </a>
                            {/* Reply and Accept buttons for requesters */}
                            {isRequester && request.status === "in_review" && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  title="Reply with Feedback"
                                  onClick={() => setActiveTab("feedback")}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Accept Design"
                                  onClick={() => handleStatusUpdate("ready_to_publish")}
                                  disabled={updatingStatus}
                                >
                                  {updatingStatus ? (
                                    <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                                  ) : (
                                    <ThumbsUp className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No final deliverables yet</p>
                  )}
                    </CardContent>
                  </Card>

              {/* Source Files Section - Only visible to designers and admins */}
              {!isRequester && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                      Source Files
                    </CardTitle>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Designers Only
                    </span>
                  </CardHeader>
                  <CardContent>
                    {sourceAssets.length > 0 ? (
                      <div className="space-y-3">
                        {sourceAssets.map((asset) => (
                          <div key={asset.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              {getFileIcon(asset.fileType)}
                              <div>
                                <p className="font-medium">{asset.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  v{asset.version} • {formatFileSize(asset.fileSize)} • by {asset.uploadedBy?.username || "Unknown"}
                                </p>
                                {asset.versionNote && (
                                  <p className="text-xs text-blue-700 mt-1">{asset.versionNote}</p>
                                )}
                              </div>
                            </div>
                            <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="text-blue-700">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                ))}
              </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No source files uploaded</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upload Button - Only for designers assigned to this request or admins */}
              {canUploadAssets && (
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Asset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload New Asset</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      {/* Asset Type */}
                      <div>
                        <label className="text-sm font-medium block mb-2">Asset Type *</label>
                        <Select
                          value={uploadData.assetType}
                          onValueChange={(value: "source" | "final") => 
                            setUploadData({ ...uploadData, assetType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="source">
                              <div className="flex items-center gap-2">
                                <FileIcon className="w-4 h-4 text-blue-600" />
                                Source File (Working file - PSD, AI, etc.)
                              </div>
                            </SelectItem>
                            <SelectItem value="final">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                Final Deliverable (Ready for requester)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Upload Mode Toggle */}
                      <div>
                        <label className="text-sm font-medium block mb-2">Upload Method</label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={uploadMode === "file" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUploadMode("file")}
                            className={uploadMode === "file" ? "flex-1" : "flex-1 bg-transparent"}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                          </Button>
                          <Button
                            type="button"
                            variant={uploadMode === "url" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUploadMode("url")}
                            className={uploadMode === "url" ? "flex-1" : "flex-1 bg-transparent"}
                          >
                            <Link2 className="w-4 h-4 mr-2" />
                            External URL
                          </Button>
                        </div>
                      </div>

                      {/* File Upload */}
                      {uploadMode === "file" && (
                        <div>
                          <label className="text-sm font-medium block mb-2">Select File *</label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                            <input
                              type="file"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload"
                              accept="image/*,.psd,.ai,.pdf,.svg,.eps"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              {selectedFile ? (
                                <div className="flex items-center justify-center gap-2">
                                  <FileIcon className="w-8 h-8 text-primary" />
                                  <div className="text-left">
                                    <p className="font-medium text-sm">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                  <p className="text-sm text-muted-foreground">
                                    Click to select a file
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, PSD, AI, PDF, SVG up to 50MB
                                  </p>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      )}

                      {/* URL Input */}
                      {uploadMode === "url" && (
                        <>
                          <div>
                            <label className="text-sm font-medium block mb-2">Filename *</label>
                            <Input
                              placeholder="e.g., banner-final.png"
                              value={uploadData.filename}
                              onChange={(e) => setUploadData({ ...uploadData, filename: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-2">File URL *</label>
                            <Input
                              placeholder="e.g., https://onedrive.com/... or Google Drive link"
                              value={uploadData.fileUrl}
                              onChange={(e) => setUploadData({ ...uploadData, fileUrl: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              OneDrive, Google Drive, Dropbox, or any public URL
                            </p>
                          </div>
                        </>
                      )}

                      {/* Version Note */}
                      <div>
                        <label className="text-sm font-medium block mb-2">Version Note (optional)</label>
                        <Textarea
                          placeholder="e.g., Updated with larger CTA button per feedback"
                          value={uploadData.versionNote}
                          onChange={(e) => setUploadData({ ...uploadData, versionNote: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {/* Error Display */}
                      {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        onClick={handleUploadAsset}
                        disabled={uploading || (uploadMode === "file" ? !selectedFile : (!uploadData.filename || !uploadData.fileUrl))}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
                      >
                        {uploading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadMode === "file" ? "Upload File" : "Add External Link"}
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="space-y-4 mt-6">
              {/* Feedback Summary for Designers */}
              {(isDesigner || isAdmin) && request.comments.filter(c => c.author.role === "requester").length > 0 && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="w-5 h-5" />
                      <p className="font-medium">
                        {request.comments.filter(c => c.author.role === "requester").length} feedback message(s) from requester
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {request.comments.length > 0 ? (
                  request.comments.map((comment) => {
                    const isRequesterFeedback = comment.author.role === "requester"
                    const isFromCurrentUser = comment.author.id === user?.id
                    
                    return (
                      <Card 
                        key={comment.id} 
                        className={`transition-all ${
                          isRequesterFeedback 
                            ? "border-l-4 border-l-amber-500 bg-amber-50/50" 
                            : isFromCurrentUser 
                              ? "border-l-4 border-l-primary/50 bg-primary/5"
                              : ""
                        }`}
                      >
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`} />
                              <AvatarFallback>{comment.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-semibold">{comment.author.username}</p>
                                <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                                  comment.author.role === "requester" 
                                    ? "bg-amber-100 text-amber-800" 
                                    : comment.author.role === "designer"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-purple-100 text-purple-800"
                                }`}>
                                  {comment.author.role}
                                </span>
                                {isRequesterFeedback && (
                                  <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded">
                                    Feedback
                              </span>
                            )}
                                {isFromCurrentUser && (
                                  <span className="text-xs text-muted-foreground">(You)</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {new Date(comment.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                    )
                  })
                ) : (
                  <Card className="bg-muted/50 border-dashed">
                    <CardContent className="pt-8 pb-8 text-center">
                      <Send className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground font-medium">No feedback yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isRequester 
                          ? "Share your thoughts on the design progress" 
                          : "Comments and feedback will appear here"
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Comment Form - Available to requesters (own requests), designers (assigned), and admins */}
              {(isAdmin || 
                (isRequester && request.requester.id === user?.id) || 
                (isDesigner && request.designer?.id === user?.id)) && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                        <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user?.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                      </div>
                    </div>
                  <Textarea
                      placeholder={isRequester 
                        ? "Share your feedback on the design..." 
                        : "Add a comment or note..."
                      }
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                      className="resize-none"
                    />
                    {error && (
                      <div className="p-2 text-sm text-red-600 bg-red-50 rounded flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                  <div className="flex gap-2">
                      <Button 
                        onClick={handleSubmitComment}
                        disabled={!feedbackText.trim() || submittingComment}
                        className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
                      >
                        {submittingComment ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                      <Send className="w-4 h-4" />
                            {isRequester ? "Send Feedback" : "Add Comment"}
                          </>
                        )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )}
            </TabsContent>

            {/* Publications Tab */}
            <TabsContent value="publications" className="space-y-4 mt-6">
              {request.status === "published" && request.publishedLink ? (
                <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-teal-700">
                      <CheckCircle2 className="w-5 h-5" />
                      Published Successfully!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                        <div>
                      <p className="text-sm text-muted-foreground mb-2">Published Link</p>
                          <a
                        href={request.publishedLink} 
                            target="_blank"
                            rel="noopener noreferrer"
                        className="text-teal-700 hover:text-teal-900 underline break-all font-medium"
                          >
                        {request.publishedLink}
                          </a>
                        </div>
                    {request.publishedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Published On</p>
                        <p className="font-semibold text-teal-700">
                          {new Date(request.publishedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                    <div className="pt-2">
                      <a 
                        href={request.publishedLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                          <Share2 className="w-4 h-4" />
                          View Published Design
                        </Button>
                      </a>
                      </div>
                    </CardContent>
                  </Card>
              ) : (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="pt-8 pb-8 text-center">
                    <Share2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground font-medium mb-2">Not published yet</p>
                    <p className="text-sm text-muted-foreground">
                      {request.status === "ready_to_publish"
                        ? "Design is ready! Requester can now publish it."
                        : "The design needs to be ready to publish before publishing."
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Workflow Progress</CardTitle>
                {(isAdmin || 
                  (isDesigner && request.designer?.id === user?.id) || 
                  (isRequester && ["draft", "ready_to_publish"].includes(request.status))
                ) && (
                  <Popover open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Update
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="end" side="bottom">
                      <div className="space-y-3">
                        {/* Current Status - Compact */}
                        <div className="pb-2 border-b">
                          <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                          <StatusBadge status={request.status} />
                        </div>

                        {/* Available Transitions - Larger, easier to click */}
                        <div>
                          <p className="text-xs font-medium mb-2 text-muted-foreground">Move to:</p>
                          <div className="space-y-1.5">
                            {getAvailableStatusTransitions().length > 0 ? (
                              getAvailableStatusTransitions().map((transition) => (
                                <button
                                  key={transition.status}
                                  onClick={() => {
                                    // For published status, handleStatusUpdate will open the publish dialog
                                    // It will close the popover itself
                                    if (transition.status === "published") {
                                      handleStatusUpdate(transition.status)
                                    } else {
                                      handleStatusUpdate(transition.status)
                                      setStatusDialogOpen(false)
                                    }
                                  }}
                                  disabled={updatingStatus}
                                  className={`w-full p-2.5 rounded-md border text-left transition-all hover:scale-[1.01] flex items-center justify-between ${transition.color} hover:opacity-90 disabled:opacity-50 cursor-pointer`}
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{transition.label}</p>
                                    <p className="text-xs opacity-75 mt-0.5">{transition.description}</p>
                                  </div>
                                  {updatingStatus ? (
                                    <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin ml-2" />
                                  ) : (
                                    <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <RefreshCw className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                <p className="text-xs">No status changes available</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                          <div className="p-2 text-xs text-red-600 bg-red-50 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" />
                            {error}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </CardHeader>
            
            {/* Publish Dialog - For entering published link */}
            <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
              <DialogContent className="max-w-xs">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-teal-600" />
                    Publish Design
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <p className="text-sm text-teal-800">
                      🎉 Congratulations! Your design is ready to be published.
                    </p>
                    <p className="text-xs text-teal-600 mt-1">
                      Please enter the link where this design has been published (e.g., website URL, social media post, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Published Link *</label>
                    <Input
                      placeholder="https://example.com/published-design"
                      value={publishedLink}
                      onChange={(e) => setPublishedLink(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => {
                      setPublishDialogOpen(false)
                      setPublishedLink("")
                      setError("")
                    }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePublish}
                      disabled={!publishedLink.trim() || updatingStatus}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {updatingStatus ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <CardContent>
              <div className="space-y-3">
                {workflowStages.slice(0, 7).map((stage, index) => (
                  <div key={stage.key} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        stage.completed
                          ? "bg-green-100 text-green-700"
                          : stage.current
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {stage.completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          stage.current ? "text-primary" : stage.completed ? "text-green-700" : "text-muted-foreground"
                        }`}
                      >
                        {stage.name}
                      </p>
                    </div>
                    {stage.current && <Clock className="w-4 h-4 text-primary animate-pulse" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.requester.username}`} />
                  <AvatarFallback>{request.requester.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{request.requester.username}</p>
                  <p className="text-xs text-muted-foreground">Requester</p>
                </div>
              </div>

              {request.designer && (
              <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.designer.username}`} />
                    <AvatarFallback>{request.designer.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium text-sm">{request.designer.username}</p>
                  <p className="text-xs text-muted-foreground">Assigned Designer</p>
                </div>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="font-semibold">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <p className="font-semibold">{request.dueDate ? formatDate(request.dueDate) : "Not set"}</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
