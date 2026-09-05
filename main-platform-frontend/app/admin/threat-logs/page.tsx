"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Download, Filter, Radio, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

const columns = [
  { header: "Time", accessor: "timestamp" as const, className: "font-mono text-xs text-muted-foreground whitespace-nowrap" },
  { header: "Project", accessor: "project" as const, className: "font-semibold text-foreground" },
  { 
    header: "Risk Score", 
    accessor: (item: any) => (
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-16 rounded-full overflow-hidden bg-muted">
          <div 
            className={`h-full transition-all ${item.score > 0.7 ? "bg-rose-500 shadow-[0_0_8px_theme(colors.rose.500)]" : item.score > 0.4 ? "bg-orange-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.max(Math.round(item.score * 100), 5)}%` }}
          />
        </div>
        <span className={`font-mono text-xs font-bold w-10 ${item.score > 0.7 ? "text-rose-400" : item.score > 0.4 ? "text-orange-400" : "text-emerald-400"}`}>
          {Math.round(item.score * 100)}%
        </span>
      </div>
    )
  },
  { header: "Event Type", accessor: "type" as const, className: "font-mono text-xs" },
  { 
    header: "Status", 
    accessor: (item: any) => <StatusBadge status={item.status} /> 
  },
  { 
    header: "Correlation ID", 
    accessor: (item: any) => (
      <span className="font-mono text-[11px] text-muted-foreground">{item.correlationId}</span>
    ) 
  },
]

export default function ThreatLogs() {
  const threatLogs = useQuery(api.admin.getThreatLogs, { limit: 100 })
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredLogs = (threatLogs ?? []).filter(log => {
    const matchesSearch = log.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.correlationId.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    if (filterSeverity === "HIGH_RISK") return log.score > 0.7
    if (filterSeverity === "SUSPICIOUS") return log.score > 0.4 && log.score <= 0.7
    if (filterSeverity === "SAFE") return log.score <= 0.4
    return true
  })

  const handleDownloadCsv = () => {
    if (!threatLogs || threatLogs.length === 0) return
    const headers = ["Timestamp", "Project", "Score", "Event Type", "Status", "Correlation ID"]
    const rows = threatLogs.map(l => [l.timestamp, l.project, Math.round(l.score * 100) + "%", l.type, l.status, l.correlationId])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aegis_threat_logs_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Threat logs exported to CSV")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Threat Logs</h1>
          <p className="text-muted-foreground mt-1">Real-time security events, state transitions, and ML threat intelligence stream.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter: <span className="font-semibold text-emerald-400">{filterSeverity}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterSeverity("ALL")}>All Events</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterSeverity("HIGH_RISK")}>High Risk (&gt;70%)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterSeverity("SUSPICIOUS")}>Suspicious (40-70%)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterSeverity("SAFE")}>Safe (&lt;40%)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by project, type, correlation ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border px-6 py-3.5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ShieldAlert className="size-4 text-emerald-400" />
              Live Security Telemetry Feed
            </CardTitle>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Radio className="size-3 text-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Live Syncing ({filteredLogs.length} Events)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[550px]">
            <AdminTable columns={columns} data={filteredLogs} emptyMessage="No telemetry events found matching current criteria." />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
