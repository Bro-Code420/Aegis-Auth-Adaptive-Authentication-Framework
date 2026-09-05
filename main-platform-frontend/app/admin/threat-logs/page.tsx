"use client"

import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"


const columns = [
  { header: "Timestamp", accessor: "timestamp" as const, className: "font-mono text-muted-foreground" },
  { header: "Project", accessor: "project" as const, className: "font-semibold" },
  { 
    header: "Risk Score", 
    accessor: (item: any) => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-12 rounded-full overflow-hidden bg-muted">
          <div 
            className={`h-full ${item.score > 0.8 ? "bg-rose-500 shadow-[0_0_8px_theme(colors.rose.500)]" : item.score > 0.6 ? "bg-orange-500" : "bg-yellow-500"}`}
            style={{ width: `${Math.round(item.score * 100)}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold w-12">{Math.round(item.score * 100)}%</span>
      </div>
    )
  },
  { header: "Event Type", accessor: "type" as const },
  { 
    header: "Status", 
    accessor: (item: any) => <StatusBadge status={item.status} /> 
  },
]

export default function ThreatLogs() {
  const threatLogs = useQuery(api.admin.getThreatLogs, { limit: 50 })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Threat Logs</h1>
          <p className="text-muted-foreground mt-1">Real-time security events and intelligence stream.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="size-4 text-emerald-400" />
              Live Security Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Live</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <AdminTable columns={columns} data={threatLogs ?? []} />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
