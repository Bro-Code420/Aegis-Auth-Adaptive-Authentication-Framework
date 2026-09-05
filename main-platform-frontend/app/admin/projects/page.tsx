"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Ban, RefreshCw, Layers, Search, Radio, CheckCircle } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

export default function ProjectsManagement() {
  const projects = useQuery(api.admin.getProjects)
  const toggleStatus = useMutation(api.admin.toggleProjectStatus)
  const rotateKey = useMutation(api.admin.rotateApiKey)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProjects = (projects ?? []).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleStatus = async (id: any, currentStatus: string) => {
    try {
      await toggleStatus({ id })
      toast.success(`Project status updated to ${currentStatus === "Active" ? "Suspended" : "Active"}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to update project status")
    }
  }

  const handleRotateKey = async (id: any, name: string) => {
    try {
      await rotateKey({ id })
      toast.success(`Generated new live API key for ${name}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to rotate API key")
    }
  }

  const handleExportCsv = () => {
    if (!projects || projects.length === 0) return
    const headers = ["Project ID", "Name", "Owner", "API Requests", "Threats", "Environment", "Status"]
    const rows = projects.map(p => [p.id, p.name, p.owner, p.requests, p.threats, p.environment, p.status])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aegis_projects_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Projects CSV exported successfully")
  }

  const columns = [
    { 
      header: "Project Name", 
      accessor: (item: any) => (
        <div>
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="block text-[11px] text-muted-foreground font-mono">{item.type} • {item.environment}</span>
        </div>
      )
    },
    { header: "Owner", accessor: "owner" as const, className: "font-mono text-xs text-muted-foreground" },
    { 
      header: "API Key", 
      accessor: (item: any) => (
        <code className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded text-emerald-400">
          {item.apiKeyPreview}
        </code>
      ) 
    },
    { header: "API Requests", accessor: "requests" as const, className: "text-center font-mono font-medium" },
    { 
      header: "Threat Events", 
      accessor: (item: any) => (
        <span className={`font-mono font-bold ${item.threats > 5 ? "text-rose-400" : item.threats > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
          {item.threats}
        </span>
      ),
      className: "text-center"
    },
    { 
      header: "Status", 
      accessor: (item: any) => <StatusBadge status={item.status} /> 
    },
    {
      header: "Actions",
      accessor: (item: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleRotateKey(item.id, item.name)} className="cursor-pointer">
              <RefreshCw className="mr-2 h-4 w-4 text-emerald-400" />
              Rotate API Key
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleToggleStatus(item.id, item.status)} className="cursor-pointer text-rose-400 focus:text-rose-400">
              <Ban className="mr-2 h-4 w-4" />
              {item.status === "Active" ? "Suspend Project" : "Activate Project"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "text-right"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Cross-platform application monitoring, credential provisioning, and management.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Radio className="size-3 text-emerald-400 animate-pulse" />
            <span>Live Sync</span>
          </div>
          <Button variant="outline" onClick={handleExportCsv} className="font-medium">
            <Layers className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <AdminTable columns={columns} data={filteredProjects} emptyMessage="No projects registered yet." />
    </div>
  )
}
