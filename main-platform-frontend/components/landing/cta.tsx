import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-secondary/50 px-8 py-16 text-center sm:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.25_0.06_195),_transparent_70%)]" />
        <div className="relative">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Secure Your Enterprise?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
            Deploy adaptive authentication in minutes. Protect every session with continuous, context-aware risk intelligence.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild className="gap-2 rounded-xl px-8">
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
