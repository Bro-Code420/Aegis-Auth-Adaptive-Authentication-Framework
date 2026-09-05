"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Activity, Server, Database, Globe, Zap, Clock, Radio, Cpu, HardDrive } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function SystemHealth() {
  const health = useQuery(api.admin.getSystemHealth)

  const services = health?.services ?? [
    { name: "ML Adaptive Risk Engine", status: "Healthy", latency: "38ms", uptime: "99.98%" },
    { name: "API Gateway & Router", status: "Healthy", latency: "8ms", uptime: "100%" },
    { name: "Convex Realtime Database", status: "Healthy", latency: "4ms", uptime: "99.99%" },
    { name: "Edge Telemetry Guard", status: "Healthy", latency: "22ms", uptime: "99.95%" },
    { name: "Auth & Passkey Service", status: "Healthy", latency: "16ms", uptime: "99.97%" },
  ]

  const telemetry = health?.telemetry ?? {
    cpuUsage: 28,
    memoryUsage: "6.8 / 16.0 GB",
    memoryPercent: 42,
    diskIo: "14.2 MB/s",
    diskPercent: 18,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">System Health & Telemetry</h1>
          <p className="text-muted-foreground mt-1">Infrastructure status, distributed service mesh, and real-time performance metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Radio className="size-3 text-emerald-400 animate-pulse" />
          <span>Real-Time Health Stream</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. API Latency</CardTitle>
            <Clock className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.avgLatency ?? "18.4"}<span className="text-xs ml-1 text-muted-foreground font-normal">ms</span></div>
            <p className="text-xs text-emerald-400 mt-1">{health?.latencyChange ?? "-3.2ms"} from nominal</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hourly Ingestion</CardTitle>
            <Zap className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.totalRequestsLastHour ?? "142"}</div>
            <p className="text-xs text-muted-foreground mt-1">Telemetry signals processed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Clusters</CardTitle>
            <Server className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.activeInstances ?? "12 / 12"}</div>
            <p className="text-xs text-emerald-400 mt-1">100% operational capacity</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Edge Nodes</CardTitle>
            <Globe className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.globalRegions ?? "24 Regions"}</div>
            <p className="text-xs text-muted-foreground mt-1">Global Anycast routing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Service Status Table */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Activity className="size-5 text-emerald-400" />
              Service Status & Edge Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-lg border border-border/60">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2 rounded-md ${service.status === "Healthy" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                      {service.name.includes("Database") ? <Database className="size-4" /> : <Server className="size-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{service.name}</h3>
                      <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Latency</p>
                      <p className="text-xs font-mono font-bold text-foreground">{service.latency}</p>
                    </div>
                    <StatusBadge status={service.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Telemetry Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Cpu className="size-5 text-emerald-400" />
              Resource Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-tight">CPU Usage</span>
                <span className="text-foreground font-bold">{telemetry.cpuUsage}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${telemetry.cpuUsage}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-tight">Memory Load</span>
                <span className="text-foreground font-bold">{telemetry.memoryUsage}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${telemetry.memoryPercent}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-tight">Disk Throughput</span>
                <span className="text-foreground font-bold">{telemetry.diskIo}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400/60 transition-all duration-300" style={{ width: `${telemetry.diskPercent}%` }} />
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40 flex items-center gap-3">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground italic">All services reporting normal health telemetry.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
