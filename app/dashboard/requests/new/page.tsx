"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"

const projects = [
  "Project Alpha",
  "Project Beta",
  "Project Gamma",
  "Marketing Campaign",
  "Product Launch",
  "Internal Comms",
]
const designTypes = ["Static Image", "Video", "Banner", "Carousel", "Document"]
const platforms = ["LinkedIn", "Instagram", "Facebook", "Website", "Print", "Internal"]
const objectives = ["Awareness", "Engagement", "Conversion", "Education", "Retention"]
const audiences = ["B2B", "B2C", "Internal", "Partners", "Investors"]

type FormStep = "basic" | "design" | "marketing" | "reference" | "timeline" | "success"

export default function NewRequestPage() {
  const [currentStep, setCurrentStep] = useState<FormStep>("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [createdRequest, setCreatedRequest] = useState<{ drmCode: string } | null>(null)
  const [formData, setFormData] = useState({
    requestName: "",
    project: "",
    brandName: "",
    priority: "",
    designType: "",
    platform: "",
    dimensions: "",
    description: "",
    objective: "",
    targetAudience: "",
    referenceUrl: "",
    referenceTitle: "",
    dueDate: "",
    publishDate: "",
  })

  const steps: FormStep[] = ["basic", "design", "marketing", "reference", "timeline"]
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

  const handleSubmit = async (asDraft: boolean = false) => {
    setIsSubmitting(true)
    setError("")

    try {
      // Build description with all the details
      const fullDescription = [
        formData.description,
        formData.project && `Project: ${formData.project}`,
        formData.brandName && `Brand: ${formData.brandName}`,
        formData.designType && `Design Type: ${formData.designType}`,
        formData.platform && `Platform: ${formData.platform}`,
        formData.dimensions && `Dimensions: ${formData.dimensions}`,
        formData.objective && `Objective: ${formData.objective}`,
        formData.targetAudience && `Target Audience: ${formData.targetAudience}`,
      ].filter(Boolean).join("\n\n")

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.requestName,
          description: fullDescription,
          referenceLink: formData.referenceUrl || null,
          priority: formData.priority || "medium",
          dueDate: formData.dueDate || null,
          status: asDraft ? "draft" : "submitted",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCreatedRequest(data.request)
        setCurrentStep("success")
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

  if (currentStep === "success") {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold">Request Submitted!</h2>
                <p className="text-muted-foreground mt-2">
                  Your design request <span className="font-mono font-semibold text-primary">{createdRequest?.drmCode || "DRM-XXX"}</span> has been
                  created successfully.
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request:</span>
                  <span className="font-semibold">{formData.requestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-semibold">{formData.project || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="font-semibold capitalize">{formData.priority || "medium"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-semibold">{formData.dueDate || "Not set"}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard/requests" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white">
                    View All Requests
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/requests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Design Request</h1>
            <p className="text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {currentStep === "basic" && "Basic Information"}
              {currentStep === "design" && "Design Specifications"}
              {currentStep === "marketing" && "Marketing Details"}
              {currentStep === "reference" && "Reference Materials"}
              {currentStep === "timeline" && "Timeline & SLA"}
            </CardTitle>
            <CardDescription>
              {currentStep === "basic" && "Let's start with the basics of your request"}
              {currentStep === "design" && "Tell us about the design specifications"}
              {currentStep === "marketing" && "Define the marketing objectives"}
              {currentStep === "reference" && "Provide any reference materials"}
              {currentStep === "timeline" && "Set deadlines and due dates"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {/* Section 1: Basic Information */}
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
                  <label className="text-sm font-medium block mb-2">Project *</label>
                  <Select
                    value={formData.project}
                    onValueChange={(value) => setFormData({ ...formData, project: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>
            )}

            {/* Section 2: Design Specifications */}
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
                  <label className="text-sm font-medium block mb-2">Design Dimensions (optional)</label>
                  <Input
                    placeholder="e.g., 1200x628"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: widthxheight in pixels</p>
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

            {/* Section 3: Marketing Details */}
            {currentStep === "marketing" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Objective *</label>
                  <Select
                    value={formData.objective}
                    onValueChange={(value) => setFormData({ ...formData, objective: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select objective" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Target Audience *</label>
                  <Select
                    value={formData.targetAudience}
                    onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Section 4: Reference Materials */}
            {currentStep === "reference" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Reference URL (optional)</label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={formData.referenceUrl}
                    onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Reference Title (optional)</label>
                  <Input
                    placeholder="e.g., Competitor Design Reference"
                    value={formData.referenceTitle}
                    onChange={(e) => setFormData({ ...formData, referenceTitle: e.target.value })}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Note:</span> Files should be stored in OneDrive externally. You can
                    share the link above or upload files after submission.
                  </p>
                </div>
              </div>
            )}

            {/* Section 5: Timeline */}
            {currentStep === "timeline" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Due Date *</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Estimated Publish Date (optional)</label>
                  <Input
                    type="date"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">SLA Information</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your priority level <span className="font-semibold capitalize">{formData.priority}</span>,
                    your SLA window is calculated automatically.
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mb-4 flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || isSubmitting}
              className="disabled:opacity-50 bg-transparent"
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
          </div>
        </Card>
      </div>
    </div>
  )
}
