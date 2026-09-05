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
import { MoreHorizontal, UserPlus, Shield, Ban, ExternalLink } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"


const columns = [
  { header: "User Email", accessor: "email" as const },
  { 
    header: "Plan", 
    accessor: (item: any) => (
      <span className={`font-medium ${item.plan === "Enterprise" ? "text-emerald-400" : item.plan === "Pro" ? "text-blue-400" : "text-muted-foreground"}`}>
        {item.plan}
      </span>
    )
  },
  { header: "Projects Count", accessor: "projects" as const, className: "text-center" },
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
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4 text-emerald-400" />
            Upgrade Plan
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Projects
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-rose-400 focus:text-rose-400">
            <Ban className="mr-2 h-4 w-4" />
            Suspend User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    className: "text-right"
  }
]

export default function UsersManagement() {
  const users = useQuery(api.admin.getUsers)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage platform developers and their access levels.</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Internal Admin
        </Button>
      </div>

      <AdminTable columns={columns} data={users ?? []} />
    </div>
  )
}
