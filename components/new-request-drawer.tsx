"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle2, AlertCircle, Copy, Plus, Maximize2, Minimize2, RectangleHorizontal, RectangleVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const designTypes = ["Static Image", "Video", "Banner", "Carousel", "Document"]
const platforms = ["LinkedIn", "Instagram", "Facebook", "X (Twitter)", "Reddit", "Pinterest", "Website", "Print", "Internal"]

// Social media dimensions with landscape/portrait indicators
const socialMediaDimensions = [
  { label: "LinkedIn Post", value: "1200x627", orientation: "landscape" },
  { label: "LinkedIn Cover", value: "1584x396", orientation: "landscape" },
  { label: "Instagram Post", value: "1080x1080", orientation: "square" },
  { label: "Instagram Story", value: "1080x1920-story", orientation: "portrait" },
  { label: "Instagram Reel", value: "1080x1920-reel", orientation: "portrait" },
  { label: "Facebook Post", value: "1200x630", orientation: "landscape" },
  { label: "Facebook Cover", value: "1640x859", orientation: "landscape" },
  { label: "X (Twitter) Post", value: "1200x675", orientation: "landscape" },
  { label: "X (Twitter) Header", value: "1500x500", orientation: "landscape" },
  { label: "Reddit Banner", value: "1920x256", orientation: "landscape" },
  { label: "Reddit Post", value: "1200x628", orientation: "landscape" },
  { label: "Pinterest Pin", value: "1000x1500", orientation: "portrait" },
  { label: "Pinterest Board Cover", value: "222x150", orientation: "landscape" },
  { label: "Custom", value: "custom", orientation: "custom" },
]

type FormStep = "basic" | "design" | "success"

type NewRequestFormData = {
  requestName: string
  brandName: string
  priority: string
  dueDate: string
  publishDate: string
  designType: string
  platform: string
  dimensions: string
  description: string
  catalogueId: string
}

type NewRequestDrawerProps = {
  /** Optional external trigger, e.g. a menu item or button */
  trigger?: React.ReactNode
  /** Optional initial values, used when cloning an existing request */
  initialValues?: Partial<NewRequestFormData>
  /** Label used in the header when cloning */
  mode?: "new" | "clone"
  /** Called after a request is successfully created so parents can refresh lists */
  onCreated?: (request: { id: string; drmCode: string; name: string }) => void
  /** Controlled open state - if provided, drawer is controlled externally */
  open?: boolean
  /** Called when drawer open state changes (for controlled mode) */
  onOpenChange?: (open: boolean) => void
}

export function NewRequestDrawer({
  trigger,
  initialValues,
  mode = "new",
  onCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NewRequestDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [currentStep, setCurrentStep] = useState<FormStep>("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [createdRequest, setCreatedRequest] = useState<{ drmCode: string; id: string; name: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false)
  const [publishDatePickerOpen, setPublishDatePickerOpen] = useState(false)
  const [customDimensions, setCustomDimensions] = useState("")
  const [catalogues, setCatalogues] = useState<Array<{ id: string; name: string }>>([])
  
  const [formData, setFormData] = useState<NewRequestFormData>({
    requestName: initialValues?.requestName || "",
    brandName: initialValues?.brandName || "",
    priority: initialValues?.priority || "",
    dueDate: initialValues?.dueDate || "",
    publishDate: initialValues?.publishDate || "",
    designType: initialValues?.designType || "",
    platform: initialValues?.platform || "",
    dimensions: initialValues?.dimensions || "",
    description: initialValues?.description || "",
    catalogueId: initialValues?.catalogueId || "",
  })

  // Helper function to parse ddmmyyyy format to Date
  const parseDDMMYYYY = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr.length !== 8) return undefined
    try {
      const day = parseInt(dateStr.slice(0, 2), 10)
      const month = parseInt(dateStr.slice(2, 4), 10) - 1 // Month is 0-indexed
      const year = parseInt(dateStr.slice(4, 8), 10)
      const date = new Date(year, month, day)
      // Validate the date
      if (isNaN(date.getTime())) return undefined
      // Check if the parsed values match (to catch invalid dates like 32/13/2024)
      if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return undefined
      }
      return date
    } catch {
      return undefined
    }
  }

  // Parse dates from initial values - could be ddmmyyyy format or ISO string
  const parseInitialDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined
    // Try parsing as ddmmyyyy first (8 digits)
    if (/^\d{8}$/.test(dateStr)) {
      return parseDDMMYYYY(dateStr)
    }
    // Otherwise try as ISO date string
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? undefined : date
  }

  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialValues?.dueDate ? parseInitialDate(initialValues.dueDate) : undefined
  )
  const [publishDate, setPublishDate] = useState<Date | undefined>(
    initialValues?.publishDate ? parseInitialDate(initialValues.publishDate) : undefined
  )

  // Update formData when dates change
  useEffect(() => {
    if (dueDate && !isNaN(dueDate.getTime())) {
      const formatted = format(dueDate, "ddMMyyyy")
      setFormData(prev => ({ ...prev, dueDate: formatted }))
    }
  }, [dueDate])

  useEffect(() => {
    if (publishDate && !isNaN(publishDate.getTime())) {
      const formatted = format(publishDate, "ddMMyyyy")
      setFormData(prev => ({ ...prev, publishDate: formatted }))
    }
  }, [publishDate])

  // Fetch catalogues on mount
  useEffect(() => {
    const fetchCatalogues = async () => {
      try {
        const res = await fetch("/api/catalogues")
        const data = await res.json()
        if (data.success) {
          setCatalogues(data.catalogues.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
        }
      } catch (error) {
        console.error("Error fetching catalogues:", error)
      }
    }
    if (open) {
      fetchCatalogues()
    }
  }, [open])

  const steps: FormStep[] = ["basic", "design"]
  const currentStepIndex = steps.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1])
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1])
    }
  }

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return ""
    const day = dateStr.slice(0, 2)
    const month = dateStr.slice(2, 4)
    const year = dateStr.slice(4, 8)
    return `${day}/${month}/${year}`
  }

  const formatDateForAPI = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return null
    const day = dateStr.slice(0, 2)
    const month = dateStr.slice(2, 4)
    const year = dateStr.slice(4, 8)
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (asDraft: boolean = false) => {
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.requestName,
          description: formData.description,
          referenceLink: null,
          priority: formData.priority || "medium",
          dueDate: formData.dueDate ? formatDateForAPI(formData.dueDate) : null,
          status: asDraft ? "draft" : "submitted",
          catalogueId: formData.catalogueId || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const created = data.request as { id: string; drmCode: string; name: string }
        setCreatedRequest(created)
        setCurrentStep("success")
        onCreated?.(created)
      } else {
        setError(data.error || "Failed to create request")
      }
    } catch (err) {
      console.error("Submit error:", err)
      setError("An error occurred while creating the request")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      // Reset wizard when closing
      setTimeout(() => {
        setCurrentStep("basic")
        setError("")
        setIsSubmitting(false)
        setCreatedRequest(null)
        setIsFullscreen(false)
      }, 200)
    }
  }

  const handleDimensionChange = (value: string) => {
    if (value === "custom") {
      setFormData({ ...formData, dimensions: "" })
      setCustomDimensions("")
    } else {
      // Convert special values back to actual dimensions
      let actualDimension = value
      if (value === "1080x1920-story" || value === "1080x1920-reel") {
        actualDimension = "1080x1920"
      }
      setFormData({ ...formData, dimensions: actualDimension })
      setCustomDimensions("")
    }
  }

  const getDimensionIcon = (dimension: string) => {
    if (dimension === "custom") return null
    const dim = socialMediaDimensions.find(d => d.value === dimension)
    if (!dim) return null
    if (dim.orientation === "landscape") return <RectangleHorizontal className="w-4 h-4 text-muted-foreground" />
    if (dim.orientation === "portrait") return <RectangleVertical className="w-4 h-4 text-muted-foreground" />
    // For square dimensions, show a square icon or nothing
    return null
  }

  const getDimensionDisplayValue = (dimension: string) => {
    // Convert special values to actual dimensions for display
    if (dimension === "1080x1920-story" || dimension === "1080x1920-reel") {
      return "1080x1920"
    }
    return dimension
  }

  const ContentWrapper = isFullscreen ? Dialog : Drawer
  const Content = isFullscreen ? DialogContent : DrawerContent
  const Header = isFullscreen ? DialogHeader : DrawerHeader
  const Title = isFullscreen ? DialogTitle : DrawerTitle
  const Description = isFullscreen ? DialogDescription : DrawerDescription
  const Footer = isFullscreen ? "div" : DrawerFooter
  const Close = isFullscreen ? Button : DrawerClose

  const content = (
    <>
      {currentStep === "success" ? (
        <div className="flex-1 overflow-auto">
          <Header className="border-b">
            <Title className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Request Submitted
            </Title>
            <Description>
              Your design request{" "}
              <span className="font-mono font-semibold text-primary">
                {createdRequest?.drmCode || "DRM-XXX"}
              </span>{" "}
              has been created successfully.
            </Description>
          </Header>
          <div className="p-4 space-y-4">
            <Card className="border-0 bg-muted">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request</span>
                  <span className="font-semibold">{formData.requestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-semibold capitalize">{formData.priority || "medium"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-semibold">
                    {formData.dueDate ? formatDateForDisplay(formData.dueDate) : "Not set"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <Footer className={isFullscreen ? "border-t p-4" : "border-t"}>
            <Close asChild={!isFullscreen}>
              <Button variant="outline" className="w-full bg-transparent">
                Close
              </Button>
            </Close>
          </Footer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header className={`border-b flex items-center gap-4 ${isFullscreen ? "p-6" : ""}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (currentStepIndex === 0 ? handleOpenChange(false) : handleBack())}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-left space-y-1 flex-1">
              <Title className={`font-bold flex items-center gap-2 ${isFullscreen ? "text-2xl" : "text-xl"}`}>
                {mode === "clone" && <Copy className="w-4 h-4 text-primary" />}
                {mode === "clone" ? "Clone Design Request" : "New Design Request"}
              </Title>
              <Description>
                Step {currentStepIndex + 1} of {steps.length}
              </Description>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const wasFullscreen = isFullscreen
                setIsFullscreen(!isFullscreen)
                // If switching modes, close and reopen
                if (open) {
                  setOpen(false)
                  setTimeout(() => {
                    setOpen(true)
                  }, 150)
                }
              }}
              title={isFullscreen ? "Minimize" : "Expand to fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
          </Header>

          <div className="px-4 pt-3 pb-2">
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 pb-4">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg">
                  {currentStep === "basic" && "Basic Information"}
                  {currentStep === "design" && "Design Specifications"}
                </CardTitle>
                <CardDescription>
                  {currentStep === "basic" && "Let's start with the basics of your request"}
                  {currentStep === "design" && "Tell us about the design specifications"}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0 space-y-6">
                {currentStep === "basic" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Request Name *</label>
                      <Input
                        placeholder="e.g., Q1 Marketing Campaign"
                        value={formData.requestName}
                        onChange={(e) => setFormData({ ...formData, requestName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Brand Name *</label>
                      <Input
                        placeholder="e.g., Acme Corp"
                        value={formData.brandName}
                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Priority Level *</label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - 120 hours SLA</SelectItem>
                          <SelectItem value="medium">Medium - 72 hours SLA</SelectItem>
                          <SelectItem value="high">High - 48 hours SLA</SelectItem>
                          <SelectItem value="campaign_critical">Campaign Critical - 24 hours SLA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Catalogue (optional)</label>
                      <Select
                        value={formData.catalogueId || undefined}
                        onValueChange={(value) => setFormData({ ...formData, catalogueId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a catalogue" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {catalogues.map((catalogue) => (
                            <SelectItem key={catalogue.id} value={catalogue.id}>
                              {catalogue.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Group this request with others in a catalogue
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Due Date *</label>
                      <Popover open={dueDatePickerOpen} onOpenChange={setDueDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {dueDate && !isNaN(dueDate.getTime()) ? formatDateForDisplay(format(dueDate, "ddMMyyyy")) : "Select due date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={(date) => {
                              setDueDate(date)
                              setDueDatePickerOpen(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Estimated Publish Date (optional)</label>
                      <Popover open={publishDatePickerOpen} onOpenChange={setPublishDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {publishDate && !isNaN(publishDate.getTime()) ? formatDateForDisplay(format(publishDate, "ddMMyyyy")) : "Select publish date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={publishDate}
                            onSelect={(date) => {
                              setPublishDate(date)
                              setPublishDatePickerOpen(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                {currentStep === "design" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Design Type *</label>
                      <Select
                        value={formData.designType}
                        onValueChange={(value) => setFormData({ ...formData, designType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select design type" />
                        </SelectTrigger>
                        <SelectContent>
                          {designTypes.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Platform *</label>
                      <Select
                        value={formData.platform}
                        onValueChange={(value) => setFormData({ ...formData, platform: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Design Dimensions *</label>
                      <Select 
                        value={formData.dimensions === "1080x1920" ? "1080x1920-story" : formData.dimensions} 
                        onValueChange={handleDimensionChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select dimensions" />
                        </SelectTrigger>
                        <SelectContent>
                          {socialMediaDimensions.map((dim) => (
                            <SelectItem key={dim.value} value={dim.value}>
                              <div className="flex items-center gap-2">
                                {getDimensionIcon(dim.value)}
                                <span>{dim.label}</span>
                                {dim.value !== "custom" && (
                                  <span className="text-muted-foreground ml-auto">{getDimensionDisplayValue(dim.value)}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.dimensions === "custom" && (
                        <div className="mt-2">
                          <Input
                            placeholder="e.g., 1200x628"
                            value={customDimensions}
                            onChange={(e) => {
                              setCustomDimensions(e.target.value)
                              setFormData({ ...formData, dimensions: e.target.value })
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Format: widthxheight in pixels</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Description & Brief *</label>
                      <Textarea
                        placeholder="Describe your design request in detail. Include any specific requirements, style preferences, or brand guidelines..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={5}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="mx-4 mb-3 flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Footer className={`border-t flex-row items-center justify-between gap-3 ${isFullscreen ? "p-4" : ""}`}>
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || isSubmitting}
              className="bg-transparent"
            >
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || !formData.requestName}
              >
                Save as Draft
              </Button>
              {currentStepIndex < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !formData.requestName}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              )}
            </div>
          </Footer>
        </div>
      )}
    </>
  )

  if (isFullscreen) {
    return (
      <>
        {trigger && (
          <DrawerTrigger asChild>
            {trigger}
          </DrawerTrigger>
        )}
        <Dialog open={open} onOpenChange={(val) => {
          if (!val) {
            setIsFullscreen(false)
          }
          handleOpenChange(val)
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            {content}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
      )}
      <DrawerContent className="sm:max-w-xl">
        {content}
      </DrawerContent>
    </Drawer>
  )
}
