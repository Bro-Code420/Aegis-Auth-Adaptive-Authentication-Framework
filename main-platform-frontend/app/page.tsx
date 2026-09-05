import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Architecture } from "@/components/landing/architecture"
import { CTA } from "@/components/landing/cta"
import { CinematicFooter } from "@/components/ui/motion-footer"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <main className="relative z-10 bg-black">
        <Hero />
        <div id="platform" className="relative z-10">
          <div id="features">
            <Features />
          </div>
        </div>
        <div id="solutions" className="relative z-10">
          <div id="architecture">
            <Architecture />
          </div>
        </div>
        <div id="company" className="relative z-10">
          <div id="cta">
            <CTA />
          </div>
        </div>
      </main>
      <CinematicFooter />
    </div>
  )
}
