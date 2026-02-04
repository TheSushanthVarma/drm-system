"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, MoreVertical, Eye, Edit, UserPlus, Trash2, Play, User } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AssignDesignerDialog } from "@/components/assign-designer-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Request {
  id: string
  requestId?: string
  name: string
  description?: string | null
  status: string
  priority: string
  requester: string
  requesterId?: number
  designer?: string
  designerId?: number
  dueDate: string
}

interface RequestsClientProps {
  requests: Request[]
  userId?: number
  userRole?: string
}

export function RequestsClient({ requests, userId, userRole }: RequestsClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; name: string; designerId?: number } | null>(null)
  const router = useRouter()

  const handleOpenAssignDialog = (request: Request) => {
    setSelectedRequest({
      id: request.requestId || request.id,
      name: request.name,
      designerId: request.designerId,
    })
    setAssignDialogOpen(true)
  }

  const handleAssigned = () => {
    // Refresh the page to get updated data
    router.refresh()
    window.location.reload()
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleViewDetails = (requestId: string) => {
    router.push(`/dashboard/requests/${requestId}`)
  }

  const getDescriptionPreview = (description: string | null | undefined): string => {
    if (!description) return ""
    if (description.length <= 28) return description
    return `${description.slice(0, 24)}...${description.slice(-4)}`
  }

  // Determine available actions based on role and request state
  const getAvailableActions = (request: Request) => {
    const actions: { label: string; icon: React.ReactNode; onClick: () => void; destructive?: boolean }[] = []

    // View is always available
    actions.push({
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => handleViewDetails(request.requestId || request.id),
    })

    if (userRole === "admin") {
      // Admin can do everything
      actions.push({
        label: "Edit",
        icon: <Edit className="w-4 h-4" />,
        onClick: () => handleViewDetails(request.requestId || request.id),
      })
      if (!request.designer && request.status === "submitted") {
        actions.push({
          label: "Assign Designer",
          icon: <UserPlus className="w-4 h-4" />,
          onClick: () => handleOpenAssignDialog(request),
        })
      }
      actions.push({
        label: "Delete",
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => {}, // TODO: Implement delete
        destructive: true,
      })
    } else if (userRole === "designer") {
      // Designer can self-assign to unassigned submitted requests
      if (!request.designer && request.status === "submitted") {
        actions.push({
          label: "Assign to Myself",
          icon: <User className="w-4 h-4" />,
          onClick: () => handleOpenAssignDialog(request),
        })
      }
      // Designer can change status on assigned requests
      if (request.designerId === userId) {
        actions.push({
          label: "Update Status",
          icon: <Play className="w-4 h-4" />,
          onClick: () => handleViewDetails(request.requestId || request.id),
        })
      }
    } else if (userRole === "requester") {
      // Requester can edit their own drafts
      if (request.requesterId === userId && request.status === "draft") {
        actions.push({
          label: "Edit",
          icon: <Edit className="w-4 h-4" />,
          onClick: () => handleViewDetails(request.requestId || request.id),
        })
      }
    }

    return actions
  }

  return (
    <>
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or DRM code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_design">In Design</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="changes_requested">Changes Requested</SelectItem>
                  <SelectItem value="ready_to_publish">Ready to Publish</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="campaign_critical">Campaign Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">Sort By</label>
              <Select defaultValue="recent">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="due-soon">Due Soon</SelectItem>
                  <SelectItem value="priority">By Priority</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requests</CardTitle>
              <CardDescription>{filteredRequests.length} requests found</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="font-semibold">DRM Code</TableHead>
                  <TableHead className="font-semibold">Request Name</TableHead>
                  <TableHead className="font-semibold">Catalogue</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Requester</TableHead>
                  <TableHead className="font-semibold">Designer</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => {
                    const actions = getAvailableActions(request)
                    return (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewDetails(request.requestId || request.id)}
                      >
                        <TableCell className="font-mono font-semibold text-primary">{request.id}</TableCell>
                        <TableCell className="font-medium">
                          {request.description ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{request.name}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getDescriptionPreview(request.description)}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            request.name
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.catalogue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
                              {request.catalogue.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={request.priority} />
                        </TableCell>
                        <TableCell className="text-sm">{request.requester}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.designer || "Unassigned"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{request.dueDate}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions.map((action, index) => (
                                <div key={action.label}>
                                  {action.destructive && index > 0 && <DropdownMenuSeparator />}
                                  <DropdownMenuItem
                                    onClick={action.onClick}
                                    className={action.destructive ? "text-destructive focus:text-destructive" : ""}
                                  >
                                    <span className="mr-2">{action.icon}</span>
                                    {action.label}
                                  </DropdownMenuItem>
                                </div>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No requests found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Designer Dialog */}
      {selectedRequest && (
        <AssignDesignerDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          requestId={selectedRequest.id}
          requestName={selectedRequest.name}
          currentDesignerId={selectedRequest.designerId}
          onAssigned={handleAssigned}
        />
      )}
    </>
  )
}
