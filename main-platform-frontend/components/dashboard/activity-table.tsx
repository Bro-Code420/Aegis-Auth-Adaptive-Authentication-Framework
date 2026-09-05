"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RiskBadge } from "./risk-badge"
import { ArrowUpDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { formatDistanceToNow } from "date-fns"

type RiskLevel = "low" | "medium" | "high" | "critical"

const riskOrder: Record<string, number> = { low: 0, medium: 1, safe: 0, suspicious: 2, high: 2, blocked: 3, critical: 3 }

type SortField = "user" | "risk" | "time" | null
type SortDir = "asc" | "desc"

import { useOrganization } from "@/components/providers/organization-provider"

export function ActivityTable({ applicationId }: { applicationId?: string | Id<"applications"> }) {
  const { activeOrganization } = useOrganization()
  const sessions = useQuery(
    api.sessions.list,
    applicationId 
      ? { applicationId: applicationId as any } 
      : (activeOrganization ? { organizationId: activeOrganization } : "skip")
  )
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    if (!sessions) return []
    let data = [...sessions]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (s) =>
          (s.userEmail || "").toLowerCase().includes(q) ||
          (s.state || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.device || "").toLowerCase().includes(q)
      )
    }
    if (sortField) {
      data.sort((a, b) => {
        let cmp = 0
        if (sortField === "user") cmp = (a.userEmail || "").localeCompare(b.userEmail || "")
        else if (sortField === "risk") {
          // Map state to a risk tier for sorting
          const getRiskLevel = (state: string) => {
             if (state === "TERMINATED" || state === "BLOCKED") return "critical";
             if (state === "CHALLENGED" || state === "RESTRICTED") return "high";
             if (state === "EVALUATING") return "medium";
             return "low";
          }
          const riskA = riskOrder[getRiskLevel(a.state || "")] || 0
          const riskB = riskOrder[getRiskLevel(b.state || "")] || 0
          cmp = riskA - riskB
        }
        else if (sortField === "time") cmp = (a.loginTime || 0) - (b.loginTime || 0)
        return sortDir === "desc" ? -cmp : cmp
      })
    }
    return data
  }, [sessions, search, sortField, sortDir])

  if (sessions === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter activity..."
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
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("user")}>
                User <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
            <TableHead>Session State</TableHead>
            <TableHead className="hidden md:table-cell">Device</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("risk")}>
                Risk <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="gap-1 -mr-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("time")}>
                Time <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No matching sessions found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((session) => {
              // Map state to a semantic risk level badge
              const getRiskLevel = (state: string) => {
                if (state === "TERMINATED" || state === "BLOCKED") return "critical";
                if (state === "CHALLENGED" || state === "RESTRICTED") return "high";
                if (state === "EVALUATING") return "medium";
                return "low";
              }

              return (
                <TableRow key={session._id} className="border-border/30">
                  <TableCell className="font-medium">{session.userEmail || "Anonymous"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.state}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{session.device || "Unknown"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{session.location || "Unknown"}</TableCell>
                  <TableCell>
                    <RiskBadge level={getRiskLevel(session.state || "low")} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(session.loginTime || Date.now()), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
