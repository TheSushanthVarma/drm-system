import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PriorityType = "low" | "medium" | "high" | "campaign_critical"

const priorityConfig: Record<PriorityType, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-green-200 text-green-800" },
  medium: { label: "Medium", className: "bg-orange-200 text-orange-800" },
  high: { label: "High", className: "bg-red-200 text-red-800" },
  campaign_critical: { label: "Campaign Critical", className: "bg-red-700 text-white" },
}

interface PriorityBadgeProps {
  priority: PriorityType
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  return <Badge className={cn("font-medium", config.className, className)}>{config.label}</Badge>
}
