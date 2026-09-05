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
import { MoreHorizontal, UserPlus, Shield, Ban, ExternalLink, Search, Radio } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function UsersManagement() {
  const users = useQuery(api.admin.getUsers)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredUsers = (users ?? []).filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const columns = [
    { 
      header: "User / Developer", 
      accessor: (item: any) => (
        <div>
          <p className="font-semibold text-foreground">{item.name || item.email}</p>
          <p className="text-xs text-muted-foreground font-mono">{item.email}</p>
        </div>
      )
    },
    { 
      header: "Plan", 
      accessor: (item: any) => (
        <span className={`font-medium text-xs px-2.5 py-1 rounded-full border ${item.plan === "Enterprise" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}`}>
          {item.plan}
        </span>
      )
    },
    { 
      header: "Role", 
      accessor: (item: any) => (
        <span className="font-mono text-xs font-bold text-muted-foreground uppercase">{item.role || "DEVELOPER"}</span>
      )
    },
    { 
      header: "Projects", 
      accessor: (item: any) => (
        <span className="font-mono text-sm font-semibold text-center block">{item.projectsCount ?? 0}</span>
      ), 
      className: "text-center" 
    },
    { 
      header: "Last Active", 
      accessor: "lastLoginAt" as const,
      className: "text-xs text-muted-foreground"
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
            <DropdownMenuLabel>Developer Controls</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4 text-emerald-400" />
              Adjust Permissions
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Inspect Applications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-rose-400 focus:text-rose-400">
              <Ban className="mr-2 h-4 w-4" />
              Suspend Access
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage platform developers, team members, and enterprise access levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Radio className="size-3 text-emerald-400 animate-pulse" />
            <span>Synced ({users?.length ?? 0} Users)</span>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Admin
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <AdminTable columns={columns} data={filteredUsers} emptyMessage="No users matching your criteria." />
    </div>
  )
}
