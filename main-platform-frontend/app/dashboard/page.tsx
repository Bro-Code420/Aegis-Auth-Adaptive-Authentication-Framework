"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useOrganization } from "@/components/providers/organization-provider"
import { useMounted } from "@/hooks/use-mounted"
import { StatCard } from "@/components/dashboard/stat-card"

import { RiskChart } from "@/components/dashboard/risk-chart"
import { ProjectInfoCard } from "@/components/dashboard/project-info-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, AlertTriangle, AppWindow, Gauge, Zap, ShieldCheck } from "lucide-react"

export default function DashboardPage() {
  const { activeOrganization } = useOrganization()
  const mounted = useMounted()
  const stats = useQuery(
    api.sessions.getStats, 
    activeOrganization ? { organizationId: activeOrganization } : "skip"
  )

  if (!mounted) return null


  const riskLevels = stats?.riskDistribution
    ? [
        { label: "Low Risk", value: stats.riskDistribution.low, color: "bg-emerald-500" },
        { label: "Medium Risk", value: stats.riskDistribution.medium, color: "bg-yellow-500" },
        { label: "High Risk", value: stats.riskDistribution.high, color: "bg-orange-500" },
        { label: "Critical", value: stats.riskDistribution.critical, color: "bg-red-500" },
      ]
    : [
        { label: "Low Risk", value: 0, color: "bg-emerald-500" },
        { label: "Medium Risk", value: 0, color: "bg-yellow-500" },
        { label: "High Risk", value: 0, color: "bg-orange-500" },
        { label: "Critical", value: 0, color: "bg-red-500" },
      ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive security posture and system telemetry.
          </p>
        </div>
      </div>

      {stats?.totalSessions === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="size-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4 text-muted-foreground/40">
            <AppWindow className="size-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No active sessions yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Your telemetry dashboard will populate automatically in real-time as users begin interacting with your connected applications.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Risk Events"
          value={stats?.totalSessions.toLocaleString() ?? "..."}
          change={`${stats?.totalSessions ?? 0} total sessions tracked`}
          trend="neutral"
          icon={AlertTriangle}
        />
        <StatCard
          title="Active Sessions"
          value={stats?.activeSessions?.toLocaleString() ?? "..."}
          change="Last 24 hours"
          trend="neutral"
          icon={Users}
        />
        <StatCard
          title="Threats Blocked"
          value={stats?.highRiskAlerts.toString() ?? "..."}
          change="Real-time protection"
          trend={stats?.highRiskAlerts ? "up" : "neutral"}
          icon={ShieldCheck}
        />
        <StatCard
          title="Avg Risk Score"
          value={stats?.avgRiskScore?.toString() ?? "..."}
          change={`Across ${stats?.activeApps ?? 0} active app${(stats?.activeApps ?? 0) !== 1 ? "s" : ""}`}
          trend="neutral"
          icon={Zap}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RiskChart />
        </div>
        <Card className="rounded-xl border-border/50 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {riskLevels.map((item) => (
                <div key={item.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-mono font-bold">{item.value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.2)] transition-all duration-500`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <div>
          <ProjectInfoCard />
        </div>
      </div>
        </>
      )}
    </div>
  )
}

