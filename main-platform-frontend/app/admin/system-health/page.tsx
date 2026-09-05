"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Activity, Server, Database, Globe, Zap, Clock } from "lucide-react"

const systemHealth = [
  { name: "ML Backend", status: "Healthy", latency: "42ms", uptime: "99.98%" },
  { name: "API Gateway", status: "Healthy", latency: "12ms", uptime: "100%" },
  { name: "Primary Database", status: "Healthy", latency: "5ms", uptime: "99.99%" },
  { name: "Edge Cache (CDN)", status: "Warning", latency: "145ms", uptime: "98.5%" },
  { name: "Auth Service", status: "Healthy", latency: "28ms", uptime: "99.95%" },
]

export default function SystemHealth() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Health</h1>
          <p className="text-muted-foreground mt-1">Infrastructure status and real-time performance telemetry.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Latency</CardTitle>
            <Clock className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5<span className="text-xs ml-1 text-muted-foreground font-normal">ms</span></div>
            <p className="text-xs text-emerald-400 mt-1">-2.1ms from last hour</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            <Zap className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128.4k</div>
            <p className="text-xs text-muted-foreground mt-1">Last 60 minutes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Instances</CardTitle>
            <Server className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 / 12</div>
            <p className="text-xs text-emerald-400 mt-1">Maximum capacity</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Global Coverage</CardTitle>
            <Globe className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24 Regions</div>
            <p className="text-xs text-muted-foreground mt-1">Across 4 continents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Service Status Table */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="size-4 text-emerald-400" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-md ${service.status === "Healthy" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                      {service.name === "Primary Database" ? <Database className="size-4" /> : <Server className="size-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{service.name}</h3>
                      <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Latency</p>
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
            <CardTitle className="text-lg font-semibold">Real-time Telemetry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-tight">CPU Usage</span>
                <span className="text-foreground">24%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "24%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-tight">Memory Load</span>
                <span className="text-foreground">6.2 / 16.0 GB</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "38%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-tight">Disk I/O</span>
                <span className="text-foreground">12.5 MB/s</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/50" style={{ width: "12%" }} />
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="bg-muted/50 p-3 rounded-lg border border-border/30 flex items-center gap-3">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground italic">All systems operational in 22 regions.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
