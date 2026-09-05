"use client"

import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, RotateCw, Trash2, Key, Info } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"


const columns = [
  { header: "Project", accessor: "project" as const, className: "font-semibold text-foreground" },
  { 
    header: "API Key", 
    accessor: (item: any) => (
      <code className="bg-muted px-2 py-1 rounded text-emerald-500 dark:text-emerald-400 text-xs font-mono">
        {item.key}
      </code>
    )
  },
  { header: "Created Date", accessor: "created" as const },
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
          <DropdownMenuItem className="cursor-pointer">
            <RotateCw className="mr-2 h-4 w-4" />
            Rotate Key
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Info className="mr-2 h-4 w-4" />
            View Permissions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-rose-400 focus:text-rose-400">
            <Trash2 className="mr-2 h-4 w-4" />
            Revoke Key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    className: "text-right"
  }
]

export default function APIKeysManagement() {
  const projects = useQuery(api.admin.getProjects)
  
  const apiKeys = projects?.map(p => ({
    id: p.id,
    project: p.name,
    key: "ak_live_••••••••" + Math.random().toString(36).substring(2, 6),
    created: "2024-03-01",
    status: p.status
  }))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage and audit security credentials for all platform applications.</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
          <Key className="mr-2 h-4 w-4" />
          Issue Special Key
        </Button>
      </div>

      <AdminTable columns={columns} data={apiKeys ?? []} />
    </div>
  )
}
