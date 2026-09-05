import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  change?: string
  trend?: "up" | "down" | "neutral"
  icon: LucideIcon
}

export function StatCard({ title, value, change, trend = "neutral", icon: Icon }: StatCardProps) {
  return (
    <Card className="rounded-xl border-border/50 bg-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{title}</span>
            <span className="text-2xl font-bold">{value}</span>
            {change && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            )}
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
