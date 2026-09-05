"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

const tooltipStyle = {
  backgroundColor: "rgba(15, 17, 23, 0.8)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "0.75rem",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  padding: "12px",
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={tooltipStyle} className="flex flex-col gap-2 min-w-[100px]">
        <p className="text-sm font-bold border-b border-white/10 pb-1 mb-1">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground capitalize">{entry.name}:</span>
              </div>
              <span className="text-xs font-mono font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

import { useOrganization } from "@/components/providers/organization-provider"

export function RiskChart({ applicationId }: { applicationId?: string | Id<"applications"> }) {
  const { activeOrganization } = useOrganization()
  const analytics = useQuery(
    api.sessions.getAnalytics,
    applicationId
      ? { applicationId: applicationId as any }
      : (activeOrganization ? { organizationId: activeOrganization } : "skip")
  )
  const data = analytics?.hourlyRiskDist ?? []

  return (
    <Card className="rounded-2xl border-border/50 bg-card/50 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">Risk Distribution (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <svg width="0" height="0" className="hidden">
          <defs>
            <linearGradient id="riskLowDash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.2 150)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.55 0.15 155)" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="riskMediumDash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.8 0.15 80)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.7 0.12 75)" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="riskHighDash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.6 0.22 25)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.5 0.18 20)" stopOpacity={0.8} />
            </linearGradient>
          </defs>
        </svg>
        <div className="h-64">
          {!analytics ? (
            <div className="flex h-full items-center justify-center text-muted-foreground italic text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Loading risk data...</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={10} barGap={4}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="oklch(0.6 0.01 260)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="oklch(0.6 0.01 260)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="low"    fill="url(#riskLowDash)"    radius={4} />
                <Bar dataKey="medium" fill="url(#riskMediumDash)" radius={4} />
                <Bar dataKey="high"   fill="url(#riskHighDash)"   radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
