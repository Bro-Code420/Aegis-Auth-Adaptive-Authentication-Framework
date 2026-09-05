"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, PieChart, Info } from "lucide-react"

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep insights into platform usage, security trends, and ML performance.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* API Requests Per Hour */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-400" />
              API Requests Per Hour
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">Real-time</span>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full bg-muted/50 rounded flex items-end justify-between p-4 gap-1">
              {[40, 65, 30, 85, 45, 70, 95, 30, 55, 75, 40, 60, 80, 50, 70, 90, 30, 45, 60, 85, 40, 55, 70, 85].map((val, i) => (
                <div 
                  key={i} 
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 transition-colors rounded-t"
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Score Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="size-4 text-emerald-400" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: "Low (0-30)", value: 65, color: "bg-emerald-500" },
              { label: "Medium (31-60)", value: 22, color: "bg-yellow-500" },
              { label: "High (61-85)", value: 10, color: "bg-orange-500" },
              { label: "Critical (86-100)", value: 3, color: "bg-rose-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attack Types breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-400" />
              Top Attack Vectors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Credential Stuffing", count: 1248, percentage: 42 },
              { name: "API Scraping", count: 852, percentage: 28 },
              { name: "Geo Anomaly", count: 420, percentage: 14 },
              { name: "Session Takeover", count: 312, percentage: 10 },
              { name: "Others", count: 180, percentage: 6 },
            ].map((attack) => (
              <div key={attack.name} className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{attack.name}</span>
                    <span className="text-muted-foreground font-mono">{attack.count}</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/50" style={{ width: `${attack.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Insight Card */}
        <Card className="bg-card border-border lg:col-span-2 border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Info className="size-4 text-emerald-400" />
              ML Model Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Based on the last 30 days of telemetry, the <span className="text-emerald-500 dark:text-emerald-400 font-semibold">Device Trust Model</span> has improved its accuracy by <span className="text-foreground font-bold">14.2%</span>. 
              We recommend increasing the weight of device integrity signals for projects in the &quot;Financial Services&quot; category to reduce false positives by an estimated 8%.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
