"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Folder, Edit, Trash2, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useAuth, usePermissions } from "@/contexts/auth-context"
import { AlertCircle } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

interface Request {
  id: string
  drmCode: string
  name: string
  description?: string | null
  status: string
  priority: string
  dueDate: string | null
  requester: {
    id: number
    username: string
    email: string
  }
  designer: {
    id: number
    username: string
    email: string
  } | null
}

interface Catalogue {
  id: string
  name: string
  description: string | null
  createdAt: string
  createdBy: {
    id: number
    username: string
    email: string
  }
  _count: {
    requests: number
  }
  requests?: Request[]
}

export default function CataloguesPage() {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCatalogue, setSelectedCatalogue] = useState<Catalogue | null>(null)
  const [selectedCatalogueRequests, setSelectedCatalogueRequests] = useState<Request[]>([])
  const [expandedCatalogue, setExpandedCatalogue] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [submitting, setSubmitting] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const { user } = useAuth()
  const permissions = usePermissions()
  const router = useRouter()

  useEffect(() => {
    fetchCatalogues()
    // Load expanded catalogue from localStorage
    const savedExpanded = localStorage.getItem("catalogue-expanded")
    if (savedExpanded) {
      setExpandedCatalogue(savedExpanded)
    }
  }, [])

  useEffect(() => {
    const container = document.getElementById("catalogues-scroll")
    if (!container) return

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container
      setScrollPosition(scrollLeft)
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }

    checkScroll()
    container.addEventListener("scroll", checkScroll)
    window.addEventListener("resize", checkScroll)

    return () => {
      container.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [catalogues])

  const fetchCatalogues = async () => {
    try {
      const res = await fetch("/api/catalogues")
      const data = await res.json()
      if (data.success) {
        // Fetch requests for each catalogue
        let cataloguesWithRequests = await Promise.all(
          data.catalogues.map(async (catalogue: Catalogue) => {
            try {
              const reqRes = await fetch(`/api/catalogues/${catalogue.id}`)
              const reqData = await reqRes.json()
              if (reqData.success && reqData.catalogue.requests) {
                return { ...catalogue, requests: reqData.catalogue.requests }
              }
            } catch (err) {
              console.error(`Error fetching requests for catalogue ${catalogue.id}:`, err)
            }
            return { ...catalogue, requests: [] }
          })
        )
        
        // Load saved order from localStorage
        const savedOrder = localStorage.getItem("catalogue-order")
        if (savedOrder) {
          try {
            const order = JSON.parse(savedOrder) as string[]
            // Reorder catalogues based on saved order
            const orderedCatalogues: Catalogue[] = []
            const catalogueMap = new Map(cataloguesWithRequests.map(c => [c.id, c]))
            
            // Add catalogues in saved order
            order.forEach(id => {
              const catalogue = catalogueMap.get(id)
              if (catalogue) {
                orderedCatalogues.push(catalogue)
                catalogueMap.delete(id)
              }
            })
            
            // Add any new catalogues that weren't in the saved order
            catalogueMap.forEach(catalogue => {
              orderedCatalogues.push(catalogue)
            })
            
            cataloguesWithRequests = orderedCatalogues
          } catch (err) {
            console.error("Error parsing saved catalogue order:", err)
          }
        }
        
        setCatalogues(cataloguesWithRequests)
        
        // Load expanded catalogue requests if needed
        const savedExpanded = localStorage.getItem("catalogue-expanded")
        if (savedExpanded && cataloguesWithRequests.find(c => c.id === savedExpanded)) {
          const expanded = cataloguesWithRequests.find(c => c.id === savedExpanded)
          if (expanded && expanded.requests && expanded.requests.length > 0) {
            setSelectedCatalogueRequests(expanded.requests)
          } else if (expanded) {
            // Fetch requests if not already loaded
            try {
              const res = await fetch(`/api/catalogues/${savedExpanded}`)
              const reqData = await res.json()
              if (reqData.success && reqData.catalogue.requests) {
                setSelectedCatalogueRequests(reqData.catalogue.requests)
              }
            } catch (error) {
              console.error("Error fetching catalogue requests:", error)
            }
          }
        }
      } else {
        setError(data.error || "Failed to load catalogues")
      }
    } catch (error) {
      console.error("Error fetching catalogues:", error)
      setError("Failed to load catalogues")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("Catalogue name is required")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/catalogues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.success) {
        await fetchCatalogues() // Refresh to get requests
        setFormData({ name: "", description: "" })
        setCreateDialogOpen(false)
      } else {
        setError(data.error || "Failed to create catalogue")
      }
    } catch (error) {
      console.error("Error creating catalogue:", error)
      setError("Failed to create catalogue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedCatalogue || !formData.name.trim()) {
      setError("Catalogue name is required")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/catalogues/${selectedCatalogue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.success) {
        await fetchCatalogues()
        setFormData({ name: "", description: "" })
        setSelectedCatalogue(null)
        setEditDialogOpen(false)
      } else {
        setError(data.error || "Failed to update catalogue")
      }
    } catch (error) {
      console.error("Error updating catalogue:", error)
      setError("Failed to update catalogue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCatalogue) return

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/catalogues/${selectedCatalogue.id}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (data.success) {
        await fetchCatalogues()
        setSelectedCatalogue(null)
        setDeleteDialogOpen(false)
      } else {
        setError(data.error || "Failed to delete catalogue")
      }
    } catch (error) {
      console.error("Error deleting catalogue:", error)
      setError("Failed to delete catalogue")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (catalogue: Catalogue) => {
    setSelectedCatalogue(catalogue)
    setFormData({
      name: catalogue.name,
      description: catalogue.description || "",
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (catalogue: Catalogue) => {
    setSelectedCatalogue(catalogue)
    setDeleteDialogOpen(true)
  }

  const handleCatalogueClick = async (catalogue: Catalogue) => {
    if (expandedCatalogue === catalogue.id) {
      setExpandedCatalogue(null)
      setSelectedCatalogueRequests([])
      localStorage.removeItem("catalogue-expanded")
    } else {
      setExpandedCatalogue(catalogue.id)
      localStorage.setItem("catalogue-expanded", catalogue.id)
      if (catalogue.requests && catalogue.requests.length > 0) {
        setSelectedCatalogueRequests(catalogue.requests)
      } else {
        // Fetch requests if not already loaded
        try {
          const res = await fetch(`/api/catalogues/${catalogue.id}`)
          const data = await res.json()
          if (data.success && data.catalogue.requests) {
            setSelectedCatalogueRequests(data.catalogue.requests)
          }
        } catch (error) {
          console.error("Error fetching catalogue requests:", error)
        }
      }
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    return new Date(dateStr).toLocaleDateString()
  }

  const getDescriptionPreview = (description: string | null | undefined): string => {
    if (!description) return ""
    if (description.length <= 28) return description
    return `${description.slice(0, 24)}...${description.slice(-4)}`
  }

  const scrollLeft = () => {
    const container = document.getElementById("catalogues-scroll")
    if (container) {
      container.scrollBy({ left: -400, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    const container = document.getElementById("catalogues-scroll")
    if (container) {
      container.scrollBy({ left: 400, behavior: "smooth" })
    }
  }

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index)
    // Set drag image
    const card = e.currentTarget as HTMLElement
    const dragImage = card.cloneNode(true) as HTMLElement
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    dragImage.style.opacity = "0.5"
    document.body.appendChild(dragImage)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setDragImage(dragImage, e.clientX - card.getBoundingClientRect().left, e.clientY - card.getBoundingClientRect().top)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newCatalogues = [...catalogues]
    const draggedItem = newCatalogues[draggedIndex]
    
    // Remove the dragged item
    newCatalogues.splice(draggedIndex, 1)
    
    // Insert at new position
    newCatalogues.splice(dropIndex, 0, draggedItem)
    
    setCatalogues(newCatalogues)
    
    // Save the new order to localStorage
    const order = newCatalogues.map(c => c.id)
    localStorage.setItem("catalogue-order", JSON.stringify(order))
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Catalogues</h1>
          <p className="text-muted-foreground">
            Group and organize your design requests by catalogue
          </p>
        </div>
        {permissions.canCreateRequest && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2">
                <Plus className="w-4 h-4" />
                New Catalogue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Catalogue</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Catalogue Name *</label>
                  <Input
                    placeholder="e.g., Q1 Marketing Campaign"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Description (optional)</label>
                  <Textarea
                    placeholder="Describe what this catalogue is for..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setCreateDialogOpen(false)
                  setFormData({ name: "", description: "" })
                  setError("")
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={submitting || !formData.name.trim()}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Horizontal Scrollable Catalogues */}
      {catalogues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Folder className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No catalogues yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first catalogue to start organizing your design requests
            </p>
            {permissions.canCreateRequest && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Catalogue
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="relative w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-4rem)] lg:max-w-[calc(100vw-18rem)]">
          {/* Left Gradient Fade - Peek Indicator */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-4 w-24 bg-gradient-to-r from-background via-background/90 to-transparent pointer-events-none z-10 transition-opacity" />
          )}
          
          {/* Right Gradient Fade - Peek Indicator */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-background via-background/90 to-transparent pointer-events-none z-10 transition-opacity" />
          )}

          {/* Scroll Buttons */}
          {catalogues.length > 0 && (
            <>
              {canScrollLeft && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-background/95 backdrop-blur-sm shadow-lg hover:bg-background border-2 h-10 w-10"
                  onClick={scrollLeft}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              {canScrollRight && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-background/95 backdrop-blur-sm shadow-lg hover:bg-background border-2 h-10 w-10"
                  onClick={scrollRight}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
            </>
          )}

          {/* Horizontal Scroll Container */}
          <div
            id="catalogues-scroll"
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{
              scrollPaddingLeft: "3rem",
              scrollPaddingRight: "3rem",
            }}
          >
            {catalogues.map((catalogue, index) => (
              <Card
                key={catalogue.id}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`min-w-[400px] max-w-[400px] flex-shrink-0 cursor-move transition-all hover:shadow-lg m-[5px] ${
                  expandedCatalogue === catalogue.id ? "ring-2 ring-primary" : ""
                } ${
                  draggedIndex === index ? "opacity-50 scale-95" : ""
                } ${
                  dragOverIndex === index ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={(e) => {
                  // Only handle click if not dragging
                  if (draggedIndex === null) {
                    handleCatalogueClick(catalogue)
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{catalogue.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {catalogue._count.requests} request{catalogue._count.requests !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(catalogue)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(catalogue)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {catalogue.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {catalogue.description}
                    </p>
                  )}

                  {/* Requests Preview */}
                  {catalogue.requests && catalogue.requests.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Requests
                      </div>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {catalogue.requests.slice(0, 5).map((request) => (
                          <div
                            key={request.id}
                            className="p-2 rounded border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/requests/${request.id}`)
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-xs font-semibold text-primary truncate">
                                  {request.drmCode}
                                </div>
                                <div className="text-sm font-medium truncate">{request.name}</div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <StatusBadge status={request.status} />
                                <PriorityBadge priority={request.priority} />
                              </div>
                            </div>
                          </div>
                        ))}
                        {catalogue.requests.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{catalogue.requests.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No requests in this catalogue
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Requests View - Appears below but doesn't hide catalogues */}
      {expandedCatalogue && selectedCatalogueRequests.length > 0 && (
        <Card className="mt-6 animate-in slide-in-from-top-2 duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Requests in {catalogues.find(c => c.id === expandedCatalogue)?.name}
                </CardTitle>
                <CardDescription>
                  {selectedCatalogueRequests.length} request{selectedCatalogueRequests.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpandedCatalogue(null)
                  setSelectedCatalogueRequests([])
                }}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-muted">
                    <TableHead className="font-semibold">DRM Code</TableHead>
                    <TableHead className="font-semibold">Request Name</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Requester</TableHead>
                    <TableHead className="font-semibold">Designer</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCatalogueRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/dashboard/requests/${request.id}`)}
                    >
                      <TableCell className="font-mono font-semibold text-primary">
                        {request.drmCode}
                      </TableCell>
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
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={request.priority} />
                      </TableCell>
                      <TableCell>{request.requester.username}</TableCell>
                      <TableCell>{request.designer?.username || "Unassigned"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(request.dueDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Catalogue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-2">Catalogue Name *</label>
              <Input
                placeholder="e.g., Q1 Marketing Campaign"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Description (optional)</label>
              <Textarea
                placeholder="Describe what this catalogue is for..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false)
              setFormData({ name: "", description: "" })
              setSelectedCatalogue(null)
              setError("")
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={submitting || !formData.name.trim()}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Catalogue</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedCatalogue?.name}</span>?
              This will remove the catalogue association from all requests, but the requests themselves will not be deleted.
            </p>
            {error && (
              <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false)
              setSelectedCatalogue(null)
              setError("")
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              variant="destructive"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
