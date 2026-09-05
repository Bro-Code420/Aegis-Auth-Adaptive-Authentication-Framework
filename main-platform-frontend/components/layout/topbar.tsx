"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Search,
  Bell,
  Shield,
  Menu,
  X,
  Building2,
  PlusCircle,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  Activity,
  Users,
  Webhook,
  Settings,
  LifeBuoy,
  Zap,
} from "lucide-react"

import { UserButton } from "@clerk/nextjs"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useOrganization } from "@/components/providers/organization-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

const navItems = [
  { href: "/dashboard/applications", label: "Applications", icon: LayoutGrid },
  { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/access", label: "Premium", icon: Zap },
  { href: "/dashboard/integrations", label: "Integrations", icon: Webhook },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
]

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const createOrganization = useMutation(api.organizations.create)
  const markAlertAsRead = useMutation(api.alerts.markAsRead)
  const markAllAlertsAsRead = useMutation(api.alerts.markAllAsRead)
  const alerts = useQuery(api.alerts.getAlerts, { limit: 20 })
  
  const pathname = usePathname()
  const router = useRouter()

  const { activeOrganization, setActiveOrganization, organizations } = useOrganization()
  const activeOrgData = organizations?.find(org => org._id === activeOrganization)

  const unreadCount = alerts?.filter(a => !a.isRead).length || 0

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background px-6 backdrop-blur-lg">
        {/* Logo & Desktop Nav Wrapper */}
        <div className="flex items-center gap-8 flex-1">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">AegisAuth</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>


        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Org Switcher */}
          <div className="hidden sm:flex items-center mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-secondary/50">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium hidden md:block">
                    {activeOrgData ? activeOrgData.name : "..."}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {organizations?.map((org: any) => (
                  <DropdownMenuItem
                    key={org._id}
                    onClick={() => setActiveOrganization(org._id)}
                    className={cn(
                      "cursor-pointer",
                      activeOrganization === org._id && "bg-secondary font-medium"
                    )}
                  >
                    <Building2 className="mr-2 size-4 text-muted-foreground" />
                    {org.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsCreateModalOpen(true)} className="cursor-pointer text-muted-foreground text-xs">
                  <PlusCircle className="mr-2 size-4" />
                  New Organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="w-full bg-background p-0 border-b">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                <Shield className="size-6 text-primary" />
                <span className="text-lg font-bold">AegisAuth</span>
              </div>
              <nav className="px-6 py-6" aria-label="Mobile navigation">
                <ul className="grid grid-cols-2 gap-3">
                  {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl p-4 text-sm font-medium transition-all shadow-sm border border-border/50",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                          )}
                        >
                          <item.icon className={cn("size-5", isActive ? "text-primary-foreground" : "text-primary")} />
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Notifications */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive border-[1.5px] border-background" />
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-popover p-0 shadow-xl border-border/50">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Activity Stream</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => markAllAlertsAsRead()}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {!alerts || alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <Activity className="size-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">All clear</p>
                        <p className="text-[10px] text-muted-foreground mt-1">We'll alert you of any suspicious activity.</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                    <DropdownMenuItem
                        key={alert._id}
                        onSelect={(e) => {
                          e.preventDefault()
                          if (!alert.isRead) markAlertAsRead({ alertId: alert._id })
                        }}
                        className={cn(
                          "flex flex-col items-start gap-1.5 px-4 py-3 border-b border-border/10 last:border-0 cursor-pointer focus:bg-secondary/40",
                          !alert.isRead ? "bg-primary/5 hover:bg-primary/10" : ""
                        )}
                    >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            {!alert.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                            <span className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              alert.severity === "CRITICAL" ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                              alert.severity === "HIGH" ? "bg-orange-500" :
                              alert.severity === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                            )} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{alert.appName}</span>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground/60 whitespace-nowrap">
                            {formatTimeAgo(alert.createdAt)}
                          </span>
                        </div>
                        <div className="flex gap-2 w-full mt-0.5">
                          <span className={cn(
                            "flex items-center text-xs leading-relaxed", 
                            !alert.isRead ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>
                            {alert.message}
                          </span>
                        </div>
                    </DropdownMenuItem>
                    ))
                )}
              </div>
              <DropdownMenuItem asChild className="justify-center py-3 text-xs font-bold text-primary hover:bg-primary/5 cursor-pointer rounded-t-none border-t border-border/40">
                <Link href="/dashboard">Explore Intelligence Stream</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          
          <AnimatedThemeToggler />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-background border-border sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">New Organization</DialogTitle>
            <DialogDescription>
              Deploy a new isolated workspace for team collaboration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="orgName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Name</Label>
              <Input
                id="orgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Aegis Security"
                className="bg-secondary/30 border-border/50 h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8"
              disabled={!newOrgName.trim()}
              onClick={async () => {
                if (!newOrgName.trim()) return;
                try {
                  const newOrgId = await createOrganization({ name: newOrgName });
                  setActiveOrganization(newOrgId as any);
                  setIsCreateModalOpen(false);
                  setNewOrgName("");
                } catch (error) {
                  console.error("Failed to create organization:", error);
                }
              }}
            >
              Initialize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
