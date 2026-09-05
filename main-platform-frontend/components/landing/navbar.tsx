import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-y border-white/5 bg-black/20 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="size-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">AegisAuth</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <Link
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#architecture"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Architecture
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button size="sm" asChild className="rounded-lg">
            <Link href="/sign-in">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
