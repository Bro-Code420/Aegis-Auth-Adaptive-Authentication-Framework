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
import { MoreHorizontal, RotateCw, Key, Copy, Radio, Search } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

export default function APIKeysManagement() {
  const apiKeys = useQuery(api.admin.getApiKeys)
  const rotateKey = useMutation(api.admin.rotateApiKey)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredKeys = (apiKeys ?? []).filter(k => 
    k.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.key.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("API Key prefix copied to clipboard")
  }

  const handleRotateKey = async (id: any, name: string) => {
    try {
      await rotateKey({ id })
      toast.success(`Successfully rotated API key for ${name}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to rotate API key")
    }
  }

  const columns = [
    { 
      header: "Project", 
      accessor: (item: any) => (
        <div>
          <span className="font-semibold text-foreground">{item.project}</span>
          <span className="block text-xs text-muted-foreground">{item.environment}</span>
        </div>
      ) 
    },
    { 
      header: "API Key", 
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          <code className="bg-muted px-2.5 py-1 rounded text-emerald-400 font-mono text-xs">
            {item.key}
          </code>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => handleCopyKey(item.key)}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      )
    },
    { header: "Environment", accessor: "environment" as const, className: "font-mono text-xs text-muted-foreground" },
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
            <DropdownMenuLabel>Key Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleRotateKey(item.id, item.project)} className="cursor-pointer">
              <RotateCw className="mr-2 h-4 w-4 text-emerald-400" />
              Rotate API Key
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyKey(item.key)} className="cursor-pointer">
              <Copy className="mr-2 h-4 w-4" />
              Copy Masked Key
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage and audit security credentials for all platform applications.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Radio className="size-3 text-emerald-400 animate-pulse" />
          <span>Real-Time Sync Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search API keys or projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <AdminTable columns={columns} data={filteredKeys} emptyMessage="No API keys provisioned yet." />
    </div>
  )
}
