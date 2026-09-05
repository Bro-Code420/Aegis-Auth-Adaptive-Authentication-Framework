"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useMounted } from "@/hooks/use-mounted"
import { StatCard } from "@/components/dashboard/stat-card"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LiveSessionsPanel } from "@/components/dashboard/live-sessions-panel"
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  ArrowLeft,
  Settings,
  Shield,
  Clock,
  Globe,
  Terminal
} from "lucide-react"
import Link from "next/link"

export default function ApplicationDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const appId = params.appId as Id<"applications">
  const mounted = useMounted()

  const app = useQuery(api.applications.getApp, { id: appId })
  const stats = useQuery(api.sessions.getStats, { applicationId: appId })
  const policies = useQuery(api.riskPolicies.list)
  const securitySettings = useQuery(api.securitySettings.getSettingsByApp, { applicationId: appId })
  const updateSecuritySettings = useMutation(api.securitySettings.updateSettings)

  const currentPolicy = policies?.find((p: any) => p._id === app?.riskPolicyId)

  function handleToggle(key: "enforceMfa" | "riskBasedAuth" | "autoBlockHighRisk" | "sessionRecording" | "ipAllowlistEnabled", currentVal: boolean) {
    if (!securitySettings) return;
    updateSecuritySettings({
        applicationId: appId,
        [key]: !currentVal
    });
  }

  if (!mounted || app === undefined || stats === undefined) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="animate-pulse italic text-sm">Initializing application environment...</p>
      </div>
    )
  }


  if (app === null) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="size-12 text-destructive" />
        <h1 className="text-xl font-bold">Application Not Found</h1>
        <p className="text-muted-foreground text-sm">You don't have access to this application or it doesn't exist.</p>
        <Button asChild className="mt-2 rounded-xl">
          <Link href="/dashboard/applications">Back to Applications</Link>
        </Button>
      </div>
    )
  }

  const riskLevels = [
    { label: "Low Risk", value: stats?.riskDistribution?.low ?? 0, color: "bg-emerald-500" },
    { label: "Medium Risk", value: stats?.riskDistribution?.medium ?? 0, color: "bg-yellow-500" },
    { label: "High Risk", value: stats?.riskDistribution?.high ?? 0, color: "bg-orange-500" },
    { label: "Critical", value: stats?.riskDistribution?.critical ?? 0, color: "bg-red-500" },
  ]

  const appRiskStatus = (stats?.avgRiskScore ?? 0) >= 0.8 
    ? "Critical Risk" 
    : (stats?.avgRiskScore ?? 0) >= 0.6 
    ? "High Risk" 
    : (stats?.avgRiskScore ?? 0) >= 0.3 
    ? "Medium Risk" 
    : "Low Risk"

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="size-3" />
          <Link href="/dashboard/applications" className="hover:text-foreground transition-colors">Applications</Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-medium">{app.name}</span>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-inner">
              <Shield className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
                <Badge variant="outline" className={
                  app.environment === "Production" 
                    ? "border-success/20 bg-success/10 text-success" 
                    : "border-warning/20 bg-warning/10 text-warning"
                }>
                  {app.environment}
                </Badge>
                <Badge variant="secondary" className="bg-secondary/50">
                  {app.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg">
                Isolated security monitoring and risk assessment for {app.name}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">

            <Button className="rounded-xl gap-2" onClick={() => router.push('/dashboard/applications')}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Events"
          value={(stats?.totalSessions ?? 0).toString()}
          change="Total sessions tracked"
          trend="neutral"
          icon={AlertTriangle}
        />
        <StatCard
          title="Active Sessions"
          value={(stats?.activeSessions ?? 0).toString()}
          change="Last 24 hours"
          trend="neutral"
          icon={Users}
        />
        <StatCard
          title="Threats Blocked"
          value={(stats?.highRiskAlerts ?? 0).toString()}
          change="High risk anomalies"
          trend="neutral"
          icon={ShieldCheck}
        />
        <StatCard
          title="Avg Risk Score"
          value={stats?.avgRiskScore !== undefined ? stats.avgRiskScore.toFixed(2) : "0.00"}
          change="Across all signals"
          trend="neutral"
          icon={Zap}
        />
      </div>

      <Tabs defaultValue="sessions" className="w-full flex flex-col">
        <div className="flex items-center pb-4 border-b border-border/40 mb-2">
          <TabsList className="bg-secondary/50 rounded-xl p-1 h-auto">
            <TabsTrigger value="sessions" className="rounded-lg px-4 py-2 text-sm font-medium">Live Sessions</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg px-4 py-2 text-sm font-medium">Security Analytics</TabsTrigger>
          </TabsList>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Tab Section */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <TabsContent value="sessions" className="mt-0 border-none p-0 outline-none">
              <LiveSessionsPanel applicationId={appId} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0 border-none p-0 outline-none">
              <AnalyticsPanel applicationId={appId} />
            </TabsContent>
          </div>

        {/* Sidebar Context Section */}
        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Application Profile</CardTitle>
              <CardDescription>System metadata and identifiers</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {[
                  { label: "App ID", icon: Terminal, value: app.appId },
                  { label: "Environment", icon: Globe, value: app.environment },
                  { label: "Status", icon: ShieldCheck, value: appRiskStatus },
                  { label: "Created At", icon: Clock, value: new Date(app._creationTime).toLocaleDateString() },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <item.icon className="size-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Risk Policy</CardTitle>
              <CardDescription>Current assessment thresholds</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{currentPolicy?.name || "Standard Policy"}</span>
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold">
                  {app.mlEnhancement ? "ML Active" : "Heuristic"}
                </Badge>
              </div>
              
              <div className="flex flex-col gap-4">
                {riskLevels.map((item) => (
                  <div key={item.label} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">{item.label}</span>
                      <span className="font-mono font-bold">{item.value}% profile</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-700`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/30 bg-secondary/10 p-4">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Policy Description</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentPolicy?.description || "Using system wide default risk assessment settings for this application."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Real-Time Security Enforcement</CardTitle>
              <CardDescription>Policies evaluated in the backend decision engine</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {[
                  { key: "enforceMfa", label: "Enforce MFA", desc: "Require Multi-Factor for targeted operations", val: securitySettings?.enforceMfa },
                  { key: "riskBasedAuth", label: "Risk-Based Step-Up", desc: "Trigger challenges precisely at 0.3 risk", val: securitySettings?.riskBasedAuth },
                  { key: "autoBlockHighRisk", label: "Auto-Block Threats", desc: "Block connection instantaneously at 0.8 risk", val: securitySettings?.autoBlockHighRisk },
                  { key: "sessionRecording", label: "Session Recording", desc: "Log session lifecycle telemetry to DB", val: securitySettings?.sessionRecording },
                  { key: "ipAllowlistEnabled", label: "IP Allowlisting", desc: "Strictly block unrecognized IP sources", val: securitySettings?.ipAllowlistEnabled }
              ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <Label className="text-sm font-semibold">{setting.label}</Label>
                        <span className="text-xs text-muted-foreground leading-tight">{setting.desc}</span>
                    </div>
                    <Switch 
                        checked={setting.val || false} 
                        onCheckedChange={() => handleToggle(setting.key as any, setting.val || false)}
                        disabled={securitySettings === undefined}
                    />
                  </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      </Tabs>
    </div>
  )
}
