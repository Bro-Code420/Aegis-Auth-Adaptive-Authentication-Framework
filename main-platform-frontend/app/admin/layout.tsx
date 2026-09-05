"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { useUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { Separator } from "@/components/ui/separator"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, user } = useUser()

  if (isLoaded && user) {
    const isAdmin = 
      user.publicMetadata?.role === "admin" || 
      user.primaryEmailAddress?.emailAddress === "devanshthaware0@gmail.com";

    if (!isAdmin) {
      console.log("User is not an admin, redirecting to dashboard")
      redirect("/dashboard") 
    }
  } else if (isLoaded && !user) {
    redirect("/sign-in")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AdminSidebar />
        <SidebarInset className="flex flex-col bg-background">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
