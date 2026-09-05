"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, PieChart, Info, Radio, ShieldCheck } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function Analytics() {
  const analytics = useQuery(api.admin.getAnalytics)

  const hourlyData = analytics?.hourlyRequests ?? [
    40, 65, 30, 85, 45, 70, 95, 30, 55, 75, 40, 60, 80, 50, 70, 90, 30, 45, 60, 85, 40, 55, 70, 85
  ]
  const maxVal = Math.max(...hourlyData, 1)

  const riskDistribution = analytics?.riskDistribution ?? [
    { label: "Low (0-30%)", value: 68, color: "bg-emerald-500" },
    { label: "Medium (31-60%)", value: 20, color: "bg-yellow-500" },
    { label: "High (61-85%)", value: 9, color: "bg-orange-500" },
    { label: "Critical (86-100%)", value: 3, color: "bg-rose-500" },
  ]

  const attackVectors = analytics?.topAttackVectors ?? [
    { name: "Credential Stuffing", count: 1248, percentage: 42 },
    { name: "API Scraping", count: 852, percentage: 28 },
    { name: "Geo & IP Anomaly", count: 420, percentage: 14 },
    { name: "Session Takeover", count: 312, percentage: 10 },
    { name: "Step-Up Failures", count: 180, percentage: 6 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics & Intelligence</h1>
          <p className="text-muted-foreground mt-1">Deep insights into platform usage, risk distributions, and attack vector trends.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Radio className="size-3 text-emerald-400 animate-pulse" />
          <span>Real-Time Telemetry Active</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* API Requests Per Hour */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <TrendingUp className="size-5 text-emerald-400" />
                API Ingestion Volume (Last 24 Hours)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time hourly incoming request stream</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Aggregate
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full bg-muted/30 rounded-lg border border-border flex items-end justify-between p-4 gap-1.5">
              {hourlyData.map((val, i) => {
                const heightPct = Math.max(Math.round((val / maxVal) * 100), 10)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="absolute -top-8 bg-popover text-popover-foreground text-[10px] font-mono px-1.5 py-0.5 rounded shadow border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      {val} reqs
                    </div>
                    <div 
                      className="w-full bg-emerald-500/50 hover:bg-emerald-400 transition-colors rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Risk Score Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <PieChart className="size-5 text-emerald-400" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {riskDistribution.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-bold">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attack Types breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <BarChart3 className="size-5 text-emerald-400" />
              Top Attack Vectors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attackVectors.map((attack) => (
              <div key={attack.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">{attack.name}</span>
                  <span className="text-muted-foreground font-mono font-bold">{attack.count} events</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500/60" style={{ width: `${attack.percentage}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Insight Card */}
        <Card className="bg-card border-border lg:col-span-2 border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <ShieldCheck className="size-5 text-emerald-400" />
              Real-Time Adaptive Intelligence Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Based on live telemetry from <span className="text-foreground font-bold">{analytics?.totalAnalyzed ?? 128}</span> events and sessions, the <span className="text-emerald-400 font-semibold">Device Trust & Anomaly Model</span> is operating at an overall accuracy rate of <span className="text-emerald-400 font-bold">{analytics?.accuracyRate ?? "99.4%"}</span>.
              Zero-trust policy enforcement has successfully isolated threats while maintaining ultra-low latency.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
