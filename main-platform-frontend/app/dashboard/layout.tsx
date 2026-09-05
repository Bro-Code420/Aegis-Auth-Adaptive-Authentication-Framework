import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { SecurityPopup } from "@/components/support/SecurityPopup"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const user = await currentUser()
  
  if (user) {
    const isAdmin = 
      user.publicMetadata?.role === "admin" || 
      user.emailAddresses?.[0]?.emailAddress === "devanshthaware0@gmail.com"

    if (isAdmin) {
      redirect("/admin")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="transition-all duration-300">
        <Topbar />
        <main className="max-w-[1600px] mx-auto p-6">{children}</main>
        <SecurityPopup />
      </div>
    </div>
  )
}
