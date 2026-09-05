import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const getVariant = () => {
    if (variant) return variant
    
    const s = status.toUpperCase()
    if (s === "ACTIVE" || s === "SAFE" || s === "SUCCESS" || s === "HEALTHY") return "success"
    if (s === "BLOCKED" || s === "CRITICAL" || s === "INACTIVE" || s === "DOWN") return "destructive"
    if (s === "EVALUATING" || s === "CHALLENGED" || s === "RESTRICTED" || s === "WARNING" || s === "SUSPICIOUS" || s === "PENDING") return "warning"
    
    return "secondary"
  }

  const v = getVariant()

  return (
    <Badge 
      variant={v === "success" || v === "warning" ? "outline" : v as any}
      className={`
        capitalize font-medium
        ${v === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}
        ${v === "warning" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : ""}
      `}
    >
      {status}
    </Badge>
  )
}
