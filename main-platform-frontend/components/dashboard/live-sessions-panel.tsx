"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RiskBadge } from "@/components/dashboard/risk-badge"
import { Radio, Eye, Search, ArrowUpDown, X, Activity, History, TrendingUp, ShieldAlert, Bug } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { useMounted } from "@/hooks/use-mounted"


type SessionStatus = "safe" | "suspicious" | "blocked" | "ACTIVE" | "CHALLENGED" | "RESTRICTED" | "BLOCKED" | string

type SortField = "user" | "riskScore" | "status" | null
type SortDir = "asc" | "desc"

function RiskHistory({ sessionId }: { sessionId: Id<"sessions"> }) {
  const history = useQuery(api.ml.getSessionMLHistory, { sessionId });

  if (history === undefined) return (
    <div className="flex flex-col gap-2">
       <div className="h-4 w-24 bg-secondary/50 animate-pulse rounded" />
       <div className="h-20 w-full bg-secondary/30 animate-pulse rounded-xl" />
    </div>
  );
  
  if (!history || history.length === 0) return (
    <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
      <p className="text-xs text-muted-foreground italic">No ML assessment history available for this session.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="size-3.5 text-primary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Risk Evolution & Factors</h4>
      </div>
      <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border/50">
        {history.map((record: any) => (
          <div key={record._id} className="group flex flex-col gap-3 rounded-xl border border-border/30 bg-secondary/5 p-3 transition-colors hover:bg-secondary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold shadow-sm ${
                  record.score >= 0.7 ? "bg-destructive/10 text-destructive border border-destructive/20" :
                  record.score >= 0.4 ? "bg-warning/10 text-warning border border-warning/20" :
                  "bg-success/10 text-success border border-success/20"
                }`}>
                  {record.score.toFixed(2)}
                </div>
                <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {record.score >= 0.9 ? "Critical Risk" : record.score >= 0.7 ? "High Risk" : record.score >= 0.4 ? "Elevated" : "Low Risk"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">@{record.modelVersion}</span>
                   </div>
                   <span className="text-[10px] text-muted-foreground">{new Date(record.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <TrendingUp className={`size-3.5 ${record.score >= 0.7 ? "text-destructive" : "text-muted-foreground/40"}`} />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
               {Object.entries(record.factors || {}).map(([key, val]: [string, any]) => (
                 <div key={key} className="flex flex-col gap-1 rounded-lg bg-background/50 p-2 border border-border/20">
                   <span className="text-[9px] uppercase font-bold text-muted-foreground/70 truncate">
                    {key.replace('Risk', '').replace('Trust', '').replace('geo', 'Geo ')}
                   </span>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-mono font-bold">{val.toFixed(2)}</span>
                     <div className="h-1 w-8 rounded-full bg-secondary/50 overflow-hidden">
                        <div className={`h-full rounded-full ${val >= 0.7 ? 'bg-destructive' : val >= 0.4 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${val * 100}%` }} />
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveSessionsPanel({ applicationId }: { applicationId?: Id<"applications"> }) {
  const sessionsList = useQuery(api.sessions.list, { applicationId: applicationId ?? undefined })
  const mounted = useMounted()
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all")
  const [detailSession, setDetailSession] = useState<any | null>(null)

  function toggleSort(field: SortField) {

    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    if (!sessionsList) return []
    let data = [...sessionsList]
    if (statusFilter !== "all" && statusFilter !== "safe" && statusFilter !== "suspicious" && statusFilter !== "blocked") {
      data = data.filter((s) => s.state === statusFilter)
    } else if (statusFilter === "safe") {
      data = data.filter((s) => (s.score ?? 0) <= 0.3)
    } else if (statusFilter === "suspicious") {
      data = data.filter((s) => (s.score ?? 0) > 0.3 && (s.score ?? 0) < 0.8)
    } else if (statusFilter === "blocked") {
      data = data.filter((s) => (s.score ?? 0) >= 0.8 || s.state === "BLOCKED")
    }

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (s) =>
          (s.userEmail || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.ip || "").includes(q) ||
          (s.device || "").toLowerCase().includes(q)
      )
    }
    if (sortField) {
      data.sort((a, b) => {
        let cmp = 0
        if (sortField === "user") cmp = (a.userEmail || "").localeCompare(b.userEmail || "")
        else if (sortField === "riskScore") cmp = (a.score ?? 0) - (b.score ?? 0)
        else if (sortField === "status") cmp = (a.state || "").localeCompare(b.state || "")
        return sortDir === "desc" ? -cmp : cmp
      })
    }
    return data as any[]
  }, [sessionsList, search, sortField, sortDir, statusFilter])

  const safeCount = sessionsList?.filter((s: any) => (s.score ?? 0) <= 0.3).length || 0
  const suspiciousCount = sessionsList?.filter((s: any) => (s.score ?? 0) > 0.3 && (s.score ?? 0) < 0.8).length || 0
  const blockedCount = sessionsList?.filter((s: any) => (s.score ?? 0) >= 0.8 || s.state === "BLOCKED").length || 0

  if (!mounted || !sessionsList) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
        <p className="animate-pulse text-sm">Loading application sessions...</p>
      </div>
    )
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Live Sessions</h2>
          <p className="text-sm text-muted-foreground">Monitor active sessions and risk scores in real time.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-success">
          <Radio className="size-4 animate-pulse" />
          <span>Live Monitoring</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <button onClick={() => setStatusFilter(statusFilter === "safe" ? "all" : "safe")} className="text-left w-full h-full block">
          <Card className={`rounded-xl border-border/50 bg-card transition-colors h-full ${statusFilter === "safe" ? "ring-2 ring-success/50" : "hover:border-success/30"}`}>
            <CardContent className="flex items-center justify-between pt-6 h-full">
              <div>
                <p className="text-sm text-muted-foreground">Safe Sessions</p>
                <p className="text-2xl font-bold text-success">{safeCount}</p>
              </div>
              <div className="size-3 rounded-full bg-success/20 ring-4 ring-success/10" />
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "suspicious" ? "all" : "suspicious")} className="text-left w-full h-full block">
          <Card className={`rounded-xl border-border/50 bg-card transition-colors h-full ${statusFilter === "suspicious" ? "ring-2 ring-warning/50" : "hover:border-warning/30"}`}>
            <CardContent className="flex items-center justify-between pt-6 h-full">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious</p>
                <p className="text-2xl font-bold text-warning">{suspiciousCount}</p>
              </div>
              <div className="size-3 rounded-full bg-warning/20 ring-4 ring-warning/10" />
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "blocked" ? "all" : "blocked")} className="text-left w-full h-full block">
          <Card className={`rounded-xl border-border/50 bg-card transition-colors h-full ${statusFilter === "blocked" ? "ring-2 ring-destructive/50" : "hover:border-destructive/30"}`}>
            <CardContent className="flex items-center justify-between pt-6 h-full">
              <div>
                <p className="text-sm text-muted-foreground">Blocked Threats</p>
                <p className="text-2xl font-bold text-destructive">{blockedCount}</p>
              </div>
              <div className="size-3 rounded-full bg-destructive/20 ring-4 ring-destructive/10" />
            </CardContent>
          </Card>
        </button>
      </div>

      <Card className="rounded-xl border-border/50 bg-card min-h-[500px] flex flex-col">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base text-primary/70 font-mono tracking-widest uppercase">Live_Telemetry_Stream</CardTitle>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Find session hash..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("user")}>
                    User_Identity <ArrowUpDown className="size-3" />
                  </Button>
                </TableHead>
                <TableHead>Device_Vector</TableHead>
                <TableHead className="hidden md:table-cell">Origin_Geo</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("riskScore")}>
                    Risk_Score <ArrowUpDown className="size-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("status")}>
                    State <ArrowUpDown className="size-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Radio className="size-6 text-muted-foreground/40 animate-pulse" />
                      <p className="text-sm font-medium">No live sessions currently streaming</p>
                      <p className="text-xs text-muted-foreground/70">Telemetry events and active sessions will appear here in real time.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((session) => (
                  <TableRow key={session._id} className="border-border/30">
                    <TableCell>
                      <div className="flex flex-col">
                         <span className="font-medium text-foreground">{session.userEmail || "Anonymous"}</span>
                         <span className="text-xs text-muted-foreground font-mono">{session.ip || "127.0.0.1"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{session.device || "SDK-Device"}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{session.browser || "Browser"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{session.location || "Local / India"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">{(session.score ?? 0).toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={(session.score ?? 0) >= 0.8 || session.state === "BLOCKED" ? "blocked" : (session.score ?? 0) > 0.3 ? "suspicious" : "safe"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setDetailSession(session)}
                      >
                        <Eye className="size-4" />
                        <span className="sr-only">View session details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Session Detail Dialog */}
      <Dialog open={!!detailSession} onOpenChange={(open) => !open && setDetailSession(null)}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              <DialogTitle>Session Intelligence</DialogTitle>
            </div>
          </DialogHeader>
          {detailSession && (
            <div className="flex flex-col gap-6 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Identity</span>
                  <span className="text-sm font-medium truncate">{detailSession.userEmail || "Anonymous"}</span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Network Context</span>
                  <span className="text-sm font-mono text-primary">{detailSession.ip || "Unknown"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Platform</span>
                  <span className="text-sm truncate">{detailSession.device || "Unknown"}</span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Location</span>
                  <span className="text-sm">{detailSession.location || "Unknown"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-inner">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-primary/80">Real-Time Risk Profile</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono tracking-tighter">{(detailSession.score ?? 0).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ 1.00</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <RiskBadge level={(detailSession.score ?? 0) >= 0.8 || detailSession.state === "BLOCKED" ? "blocked" : (detailSession.score ?? 0) > 0.3 ? "suspicious" : "safe"} />
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60">
                    <ShieldAlert className="size-3" />
                    <span>ML ENHANCED</span>
                  </div>
                </div>
              </div>

              {/* Added Risk History Section */}
              <div className="border-t border-border/40 pt-4">
                <RiskHistory sessionId={detailSession._id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
