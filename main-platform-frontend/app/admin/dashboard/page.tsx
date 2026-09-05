"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/admin/StatCard"
import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Users, Briefcase, Zap, ShieldAlert } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getGlobalStats)
  const recentThreats = useQuery(api.admin.getThreatLogs, { limit: 5 })

  const statItems = [
    { title: "Total Developers", value: stats?.totalDevelopers ?? "...", icon: Users, trend: { value: "+12%", positive: true } },
    { title: "Total Projects", value: stats?.totalProjects ?? "...", icon: Briefcase, trend: { value: "+5%", positive: true } },
    { title: "API Requests Today", value: stats?.apiRequestsToday ?? "...", icon: Zap, trend: { value: "+28%", positive: true } },
    { title: "Threats Detected", value: stats?.threatsDetected ?? "...", icon: ShieldAlert, trend: { value: "-4%", positive: true } },
  ]

  const columns = [
    { header: "Timestamp", accessor: "timestamp" as const },
    { header: "Project", accessor: "project" as const },
    { 
      header: "Risk Score", 
      accessor: (item: any) => (
        <span className={`font-mono font-bold ${item.score > 0.8 ? "text-rose-400" : item.score > 0.6 ? "text-orange-400" : "text-yellow-400"}`}>
          {Math.round(item.score * 100)}%
        </span>
      )
    },
    { header: "Event Type", accessor: "type" as const },
    { 
      header: "Status", 
      accessor: (item: any) => <StatusBadge status={item.status} /> 
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">High-level platform statistics and real-time security posture.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Charts Placeholder */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Risk Trend (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/50 rounded-lg border border-border flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-muted-foreground font-mono text-sm">[ Risk Trend Graph Placeholder ]</span>
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-border" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border/50" />
            <div className="absolute top-1/4 left-0 right-0 h-px bg-border/30" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Threats Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Recent Threat Logs</h2>
        </div>
        <AdminTable columns={columns} data={recentThreats ?? []} />
      </div>
    </div>
  )
}
