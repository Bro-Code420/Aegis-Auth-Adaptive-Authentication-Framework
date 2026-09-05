import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RiskLevel = "low" | "medium" | "high" | "critical"
type SessionStatus = "safe" | "suspicious" | "blocked"

interface RiskBadgeProps {
  level: RiskLevel | SessionStatus
}

const styles: Record<string, string> = {
  low: "bg-success/10 text-success border-success/20",
  safe: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  suspicious: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
}

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", styles[level])}
    >
      {level}
    </Badge>
  )
}
