"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, TrendingUp, CheckCircle2, Clock, Palette, UserPlus, AlertCircle, Package } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth, usePermissions } from "@/contexts/auth-context"
import { AssignDesignerDialog } from "@/components/assign-designer-dialog"
import { NewRequestDrawer } from "@/components/new-request-drawer"

interface RequestData {
  id: string
  drmCode: string
  name: string
  description?: string | null
  status: string
  priority: string
  dueDate: string | null
  catalogue: { id: string; name: string } | null
  requester: { id: number; username: string; email: string }
  designer: { id: number; username: string; email: string } | null
}

export default function Dashboard() {
  const [myRequests, setMyRequests] = useState<RequestData[]>([])
  const [allRequests, setAllRequests] = useState<RequestData[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; name: string; designerId?: number } | null>(null)
  const [usernameFilter, setUsernameFilter] = useState<string>("")
  const [unassignedDialogOpen, setUnassignedDialogOpen] = useState(false)
  // Initialize with current month and year
  const now = new Date()
  const [monthFilter, setMonthFilter] = useState<string>(String(now.getMonth() + 1).padStart(2, "0"))
  const [yearFilter, setYearFilter] = useState<string>(String(now.getFullYear()))
  const { user, isDesigner, isAdmin, isRequester } = useAuth()
  const permissions = usePermissions()

  // Set default filters on mount
  useEffect(() => {
    // Only set username filter for requesters and admins, not designers
    if (!isDesigner) {
      if (user?.username && isRequester) {
        setUsernameFilter(user.username)
      } else {
        setUsernameFilter("all")
      }
    }
    // Ensure current month and year are set (already initialized in state, but update if needed)
    const now = new Date()
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0")
    const currentYear = String(now.getFullYear())
    if (!monthFilter) setMonthFilter(currentMonth)
    if (!yearFilter) setYearFilter(currentYear)
  }, [user, monthFilter, yearFilter, isDesigner, isRequester])

  useEffect(() => {
    fetchRequests()
  }, [user])

  const handleOpenAssignDialog = (request: RequestData, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRequest({
      id: request.id,
      name: request.name,
      designerId: request.designer?.id,
    })
    setAssignDialogOpen(true)
  }

  const handleAssigned = () => {
    fetchRequests()
    setAssignDialogOpen(false)
  }

  const fetchRequests = async () => {
    try {
      // Fetch "my" requests - use ?mine=true for designers to get only assigned requests
      const myRes = await fetch("/api/requests?mine=true")
      const myData = await myRes.json()
      if (myData.success) {
        setMyRequests(myData.requests)
      }

      // Fetch "all" requests (for team view)
      const allRes = await fetch("/api/requests?all=true")
      const allData = await allRes.json()
      if (allData.success) {
        setAllRequests(allData.requests)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter all requests by username, month, and year
  const getFilteredAllRequests = () => {
    let filtered = [...allRequests]

    // Filter by username (requester) - only for non-designers
    if (!isDesigner && usernameFilter && usernameFilter !== "all") {
      filtered = filtered.filter(r => r.requester.username === usernameFilter)
    }

    // Filter by month and year
    if (monthFilter && monthFilter !== "all" && yearFilter && yearFilter !== "all") {
      filtered = filtered.filter(r => {
        if (!r.dueDate) return false
        const requestDate = new Date(r.dueDate)
        const requestMonth = String(requestDate.getMonth() + 1).padStart(2, "0")
        const requestYear = String(requestDate.getFullYear())
        return requestMonth === monthFilter && requestYear === yearFilter
      })
    } else if (monthFilter && monthFilter !== "all") {
      // Filter by month only (any year)
      filtered = filtered.filter(r => {
        if (!r.dueDate) return false
        const requestDate = new Date(r.dueDate)
        const requestMonth = String(requestDate.getMonth() + 1).padStart(2, "0")
        return requestMonth === monthFilter
      })
    } else if (yearFilter && yearFilter !== "all") {
      // Filter by year only (any month)
      filtered = filtered.filter(r => {
        if (!r.dueDate) return false
        const requestDate = new Date(r.dueDate)
        const requestYear = String(requestDate.getFullYear())
        return requestYear === yearFilter
      })
    }

    return filtered
  }

  // Get unique usernames from all requests for filter dropdown
  const getUniqueUsernames = () => {
    const usernames = new Set(allRequests.map(r => r.requester.username))
    return Array.from(usernames).sort()
  }

  // Generate month options (1-12)
  const getMonthOptions = () => {
    const months = [
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ]
    return months
  }

  // Generate year options (current year and previous 5 years)
  const getYearOptions = () => {
    const years = []
    const now = new Date()
    const currentYear = now.getFullYear()
    for (let i = 0; i < 6; i++) {
      const year = currentYear - i
      years.push({ value: String(year), label: String(year) })
    }
    return years
  }

  // Calculate stats based on role
  const calculateStats = () => {
    const totalRequests = allRequests.length
    const myRequestsCount = myRequests.length
    const assignedToMe = myRequests.filter(r => r.designer?.id === user?.id).length
    const inDesign = myRequests.filter(r => r.status === "in_design").length
    const pendingApproval = myRequests.filter(r => ["in_review", "submitted"].includes(r.status)).length

    if (user?.role === "admin") {
      return [
        { title: "Total Requests", value: totalRequests.toString(), description: "All requests in system", icon: TrendingUp },
        { title: "Pending Review", value: allRequests.filter(r => r.status === "in_review").length.toString(), description: "Awaiting approval", icon: Clock },
        { title: "In Design", value: allRequests.filter(r => r.status === "in_design").length.toString(), description: "Currently being designed", icon: Palette },
      ]
    } else if (user?.role === "designer") {
      return [
        { title: "Assigned to Me", value: assignedToMe.toString(), description: `${inDesign} in design`, icon: CheckCircle2 },
        { title: "All Requests", value: totalRequests.toString(), description: "Visible requests", icon: TrendingUp },
        { title: "In Review", value: myRequests.filter(r => r.status === "in_review").length.toString(), description: "Pending approval", icon: Clock },
      ]
    } else {
      return [
        { title: "My Requests", value: myRequestsCount.toString(), description: `${pendingApproval} pending`, icon: TrendingUp },
        { title: "In Progress", value: myRequests.filter(r => ["in_design", "assigned"].includes(r.status)).length.toString(), description: "Being worked on", icon: Palette },
        { title: "Completed", value: myRequests.filter(r => ["ready_to_publish", "completed", "published"].includes(r.status)).length.toString(), description: "Ready for download", icon: CheckCircle2 },
      ]
    }
  }

  const stats = calculateStats()
  
  // Get unassigned submitted requests (for admins and designers)
  const unassignedRequests = allRequests.filter(r => r.status === "submitted" && !r.designer)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    return new Date(dateStr).toLocaleDateString()
  }

  const getDescriptionPreview = (description: string | null | undefined): string => {
    if (!description) return ""
    if (description.length <= 28) return description
    return `${description.slice(0, 24)}...${description.slice(-4)}`
  }

  const renderRequestsTable = (requestList: RequestData[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }

    if (requestList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      )
    }

    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-muted">
              <TableHead className="font-semibold">DRM Code</TableHead>
              <TableHead className="font-semibold">Request Name</TableHead>
              <TableHead className="font-semibold">Catalogue</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              <TableHead className="font-semibold">{isDesigner ? "Requester" : "Designer"}</TableHead>
              <TableHead className="font-semibold">Due Date</TableHead>
              {(isAdmin || isDesigner) && <TableHead className="font-semibold w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestList.map((request) => (
              <TableRow 
                key={request.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => window.location.href = `/dashboard/requests/${request.id}`}
              >
                <TableCell className="font-mono font-semibold text-primary">{request.drmCode}</TableCell>
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
                <TableCell>
                  {request.catalogue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm">
                      <Package className="w-3 h-3" />
                      {request.catalogue.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={request.priority} />
                </TableCell>
                <TableCell>
                  {isDesigner ? request.requester.username : (request.designer?.username || "Unassigned")}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(request.dueDate)}</TableCell>
                {(isAdmin || isDesigner) && (
                  <TableCell>
                    {!request.designer && request.status === "submitted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={(e) => handleOpenAssignDialog(request, e)}
                      >
                        <UserPlus className="w-3 h-3" />
                        {isDesigner ? "Take" : "Assign"}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username}! Here's your design request overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Unassigned Requests Badge - Compact */}
          {(isAdmin || isDesigner) && unassignedRequests.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => setUnassignedDialogOpen(true)}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{unassignedRequests.length} Unassigned</span>
            </Button>
          )}
          {permissions.canCreateRequest && (
            <NewRequestDrawer
              onCreated={fetchRequests}
              trigger={
                <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2">
                  <Plus className="w-4 h-4" />
                  New Request
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-medium text-foreground">{stat.title}</div>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">{loading ? "..." : stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>


      {/* Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requests</CardTitle>
              <CardDescription>
                {isDesigner 
                  ? "All requests filtered by current month and year by default"
                  : "All requests filtered by your username and current month by default"
                }
              </CardDescription>
            </div>
            <Link href="/dashboard/requests">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {!isDesigner && (
                <div className="flex-1">
                  <label className="text-sm font-medium block mb-2">Requester</label>
                  <Select value={usernameFilter || "all"} onValueChange={setUsernameFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select requester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requesters</SelectItem>
                      {getUniqueUsernames().map((username) => (
                        <SelectItem key={username} value={username}>
                          {username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex-1">
                <label className="text-sm font-medium block mb-2">Month</label>
                <Select value={monthFilter || "all"} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium block mb-2">Year</label>
                <Select value={yearFilter || "all"} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {getYearOptions().map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {renderRequestsTable(
            getFilteredAllRequests().slice(0, 10),
            "No requests found matching the filters."
          )}
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

      {/* Unassigned Requests Dialog */}
      <Dialog open={unassignedDialogOpen} onOpenChange={setUnassignedDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Unassigned Requests</DialogTitle>
            <DialogDescription>
              {isDesigner ? "Click 'Take' to assign yourself to a request" : "Assign designers to these requests"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* Priority Counts */}
            {unassignedRequests.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {unassignedRequests.filter(r => r.priority === "campaign_critical").length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {unassignedRequests.filter(r => r.priority === "high").length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {unassignedRequests.filter(r => r.priority === "medium").length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {unassignedRequests.filter(r => r.priority === "low").length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Low</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {unassignedRequests.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total</div>
                </div>
              </div>
            )}
            {unassignedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unassigned requests found.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow className="hover:bg-muted">
                      <TableHead className="font-semibold">DRM Code</TableHead>
                      <TableHead className="font-semibold">Request Name</TableHead>
                      <TableHead className="font-semibold">Catalogue</TableHead>
                      <TableHead className="font-semibold">Priority</TableHead>
                      <TableHead className="font-semibold">Requester</TableHead>
                      <TableHead className="font-semibold">Due Date</TableHead>
                      <TableHead className="font-semibold w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedRequests.map((request) => (
                      <TableRow 
                        key={request.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-mono font-semibold text-primary">{request.drmCode}</TableCell>
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
                        <TableCell>
                          {request.catalogue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm">
                              <Package className="w-3 h-3" />
                              {request.catalogue.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={request.priority} />
                        </TableCell>
                        <TableCell>{request.requester.username}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(request.dueDate)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenAssignDialog(request, e)
                            }}
                          >
                            <UserPlus className="w-3 h-3" />
                            {isDesigner ? "Take" : "Assign"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
