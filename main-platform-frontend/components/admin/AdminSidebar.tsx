"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Key,
  ShieldAlert,
  BarChart3,
  Cpu,
  Activity,
  Settings,
  Shield,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { UserButton } from "@clerk/nextjs"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/admin/dashboard" },
  { title: "Users", icon: Users, url: "/admin/users" },
  { title: "Projects", icon: Briefcase, url: "/admin/projects" },
  { title: "API Keys", icon: Key, url: "/admin/api-keys" },
  { title: "Threat Logs", icon: ShieldAlert, url: "/admin/threat-logs" },
  { title: "Analytics", icon: BarChart3, url: "/admin/analytics" },
  { title: "ML Models", icon: Cpu, url: "/admin/models" },
  { title: "System Health", icon: Activity, url: "/admin/system-health" },
  { title: "Settings", icon: Settings, url: "/admin/settings" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Shield className="size-6 text-emerald-400" />
          <span className="font-bold text-foreground italic tracking-tight">
            AEGIS<span className="text-emerald-400">ADMIN</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarMenu className="px-2 gap-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url}
                className={`
                  hover:bg-sidebar-accent hover:text-emerald-400 py-6
                  ${pathname === item.url ? "bg-sidebar-accent text-emerald-400" : ""}
                `}
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className="size-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="bg-border" />
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <UserButton afterSignOutUrl="/" />
          <AnimatedThemeToggler />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

