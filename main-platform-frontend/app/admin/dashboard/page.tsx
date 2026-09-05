"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/admin/StatCard"
import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Users, Briefcase, Zap, ShieldAlert, Activity, Radio } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getGlobalStats)
  const recentThreats = useQuery(api.admin.getThreatLogs, { limit: 6 })

  const statItems = [
    { 
      title: "Total Developers", 
      value: stats?.totalDevelopers ?? "...", 
      icon: Users, 
      trend: { value: stats?.trends?.developers ?? "+12%", positive: true } 
    },
    { 
      title: "Active Projects", 
      value: stats?.totalProjects ?? "...", 
      icon: Briefcase, 
      trend: { value: stats?.trends?.projects ?? "+1", positive: true } 
    },
    { 
      title: "API Requests Today", 
      value: stats?.apiRequestsToday ?? "...", 
      icon: Zap, 
      trend: { value: stats?.trends?.requests ?? "+28%", positive: true } 
    },
    { 
      title: "Threats Detected", 
      value: stats?.threatsDetected ?? "...", 
      icon: ShieldAlert, 
      trend: { value: stats?.trends?.threats ?? "Active", positive: (stats?.threatsDetected ?? 0) === 0 } 
    },
  ]

  const columns = [
    { header: "Timestamp", accessor: "timestamp" as const, className: "font-mono text-xs text-muted-foreground" },
    { header: "Project", accessor: "project" as const, className: "font-semibold text-foreground" },
    { 
      header: "Risk Score", 
      accessor: (item: any) => (
        <span className={`font-mono font-bold ${item.score > 0.7 ? "text-rose-400" : item.score > 0.4 ? "text-yellow-400" : "text-emerald-400"}`}>
          {Math.round(item.score * 100)}%
        </span>
      )
    },
    { header: "Event Type", accessor: "type" as const, className: "font-mono text-xs" },
    { 
      header: "Status", 
      accessor: (item: any) => <StatusBadge status={item.status} /> 
    },
  ]

  const riskTrendData = stats?.riskTrend ?? [
    { time: "00:00", requests: 12, avgRisk: 14, threats: 0 },
    { time: "02:00", requests: 18, avgRisk: 19, threats: 0 },
    { time: "04:00", requests: 9, avgRisk: 12, threats: 0 },
    { time: "06:00", requests: 25, avgRisk: 22, threats: 0 },
    { time: "08:00", requests: 45, avgRisk: 35, threats: 1 },
    { time: "10:00", requests: 78, avgRisk: 42, threats: 2 },
    { time: "12:00", requests: 95, avgRisk: 38, threats: 1 },
    { time: "14:00", requests: 84, avgRisk: 29, threats: 0 },
    { time: "16:00", requests: 62, avgRisk: 31, threats: 1 },
    { time: "18:00", requests: 75, avgRisk: 45, threats: 2 },
    { time: "20:00", requests: 52, avgRisk: 24, threats: 0 },
    { time: "22:00", requests: 38, avgRisk: 18, threats: 0 },
  ]

  const maxRequests = Math.max(...riskTrendData.map(d => d.requests), 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">High-level platform statistics and real-time security posture.</p>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
          <Radio className="size-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400">Live Convex Real-Time Sync</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Dynamic Real-Time Risk & Request Trend Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="size-5 text-emerald-400" />
              Real-Time Activity & Risk Distribution (24h)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Continuous telemetry aggregate from live application sessions</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-emerald-500/80" />
              <span className="text-muted-foreground">Requests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-orange-400" />
              <span className="text-muted-foreground">Avg Risk Score %</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[260px] w-full bg-muted/30 rounded-lg border border-border p-4 flex flex-col justify-between">
            <div className="grid grid-cols-12 gap-2 h-[190px] items-end">
              {riskTrendData.map((bucket, idx) => {
                const reqHeight = Math.max(Math.round((bucket.requests / maxRequests) * 100), 12)
                const riskHeight = Math.max(bucket.avgRisk, 8)
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 bg-popover text-popover-foreground text-[10px] font-mono p-1.5 rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                      <div>Reqs: <span className="font-bold text-emerald-400">{bucket.requests}</span></div>
                      <div>Risk: <span className="font-bold text-orange-400">{bucket.avgRisk}%</span></div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* Request Bar */}
                      <div 
                        className="w-1/2 bg-emerald-500/70 hover:bg-emerald-400 rounded-t transition-all"
                        style={{ height: `${reqHeight}%` }}
                      />
                      {/* Risk Bar */}
                      <div 
                        className="w-1/2 bg-orange-500/60 hover:bg-orange-400 rounded-t transition-all"
                        style={{ height: `${riskHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground scale-90 whitespace-nowrap">{bucket.time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Threats Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-rose-400" />
            <h2 className="text-xl font-bold text-foreground">Live Threat Intelligence Stream</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">Auto-refreshing via WebSocket</span>
        </div>
        <AdminTable columns={columns} data={recentThreats ?? []} emptyMessage="No threat events detected in recent telemetry." />
      </div>
    </div>
  )
}
