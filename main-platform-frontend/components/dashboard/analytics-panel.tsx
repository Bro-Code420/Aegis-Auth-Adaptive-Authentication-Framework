"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

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
      <div style={tooltipStyle} className="flex flex-col gap-2 min-w-[120px]">
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

export function AnalyticsPanel({ applicationId }: { applicationId?: Id<"applications"> }) {
  const analytics = useQuery(api.sessions.getAnalytics, { applicationId: applicationId ?? undefined })

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
        <p className="animate-pulse text-sm">Aggregating real-time analytics...</p>
      </div>
    )
  }

  const { riskDist, deviceTrust } = analytics

  // If no risk dist or no data found (very zeroed state)
  const totalRisks = riskDist.reduce((acc: number, curr: any) => acc + curr.low + curr.medium + curr.high + curr.critical, 0)
  if (totalRisks === 0) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center border border-border/30 rounded-xl bg-card/30 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-foreground mb-2">No analytics available</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
                There hasn't been any session activity for this application in the last 7 days. Once events are generated, analytical charts will appear here.
            </p>
        </div>
     );
  }

  const handleExportCSV = () => {
    const headers = ["Day", "Risk: Low", "Risk: Medium", "Risk: High", "Risk: Critical", "Device: Trusted", "Device: Unknown", "Device: Untrusted"]
    const rows = (riskDist as any[]).map((rd, i) => {
      const dt = (deviceTrust as any[])[i]
      return [
        rd.day,
        rd.low,
        rd.medium,
        rd.high,
        rd.critical,
        dt?.trusted || 0,
        dt?.unknown || 0,
        dt?.untrusted || 0
      ]
    })
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `aegis_analytics_${applicationId}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Security Analytics</h2>
          <p className="text-sm text-muted-foreground">Deep dive into application specific risk patterns and system health.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCSV}
          className="rounded-xl border-border/50 bg-card/50 hover:bg-accent/50 transition-all font-semibold gap-2"
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="riskLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.2 150)" stopOpacity={1} />
            <stop offset="100%" stopColor="oklch(0.55 0.15 155)" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="riskMedium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.8 0.15 80)" stopOpacity={1} />
            <stop offset="100%" stopColor="oklch(0.7 0.12 75)" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="riskHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.6 0.22 25)" stopOpacity={1} />
            <stop offset="100%" stopColor="oklch(0.5 0.18 20)" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="riskCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.45 0.25 25)" stopOpacity={1} />
            <stop offset="100%" stopColor="oklch(0.35 0.2 20)" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50 bg-card/50 shadow-lg backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Risk Distribution</CardTitle>
            <CardDescription>Weekly risk level breakdown across all sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDist} barSize={12} barGap={6}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.6 0.01 260)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="oklch(0.6 0.01 260)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="low"      fill="url(#riskLow)"      radius={4} />
                  <Bar dataKey="medium"   fill="url(#riskMedium)"   radius={4} />
                  <Bar dataKey="high"     fill="url(#riskHigh)"     radius={4} />
                  <Bar dataKey="critical" fill="url(#riskCritical)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 shadow-lg backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Device Trust Trends</CardTitle>
            <CardDescription>Device trust levels over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deviceTrust}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.6 0.01 260)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="oklch(0.6 0.01 260)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="trusted" stroke="oklch(0.65 0.2 150)" strokeWidth={3} dot={{ r: 4, fill: "oklch(0.65 0.2 150)", strokeWidth: 0 }} activeDot={{ r: 6, stroke: "rgba(255,255,255,0.1)", strokeWidth: 4 }} />
                  <Line type="monotone" dataKey="unknown" stroke="oklch(0.8 0.15 80)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="untrusted" stroke="oklch(0.6 0.22 25)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 shadow-lg backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Login Anomaly Trends</CardTitle>
            <CardDescription>Anomalous login patterns vs. baseline (24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.hourlyRiskDist?.map((h: any) => ({
                  hour: h.hour,
                  anomalies: h.high,
                  baseline: (h.low + h.medium),
                })) || []}>
                  <defs>
                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.6 0.01 260)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="oklch(0.6 0.01 260)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" stroke="oklch(0.6 0.01 260)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="oklch(0.6 0.01 260)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="baseline" stroke="oklch(0.6 0.01 260)" fill="url(#colorBaseline)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="anomalies" stroke="oklch(0.65 0.15 250)" fill="url(#anomalyGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
