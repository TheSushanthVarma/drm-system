import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusType =
  | "draft"
  | "submitted"
  | "assigned"
  | "in_design"
  | "in_review"
  | "changes_requested"
  | "ready_to_publish"
  | "completed"
  | "published"
  | "archived"

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-200 text-slate-800" },
  submitted: { label: "Submitted", className: "bg-blue-200 text-blue-800" },
  assigned: { label: "Assigned", className: "bg-orange-200 text-orange-800" },
  in_design: { label: "In Design", className: "bg-purple-200 text-purple-800" },
  in_review: { label: "In Review", className: "bg-cyan-200 text-cyan-800" },
  changes_requested: { label: "Changes Requested", className: "bg-red-200 text-red-800" },
  ready_to_publish: { label: "Ready to Publish", className: "bg-green-200 text-green-800" },
  completed: { label: "Completed", className: "bg-emerald-200 text-emerald-800" },
  published: { label: "Published", className: "bg-teal-200 text-teal-800" },
  archived: { label: "Archived", className: "bg-slate-400 text-slate-100" },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || { 
    label: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), 
    className: "bg-gray-200 text-gray-800" 
  }
  return <Badge className={cn("font-medium", config.className, className)}>{config.label}</Badge>
}
