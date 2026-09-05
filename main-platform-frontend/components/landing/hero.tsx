"use client"

import React from "react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black select-none">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        autoPlay
        loop
        muted
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
      />

      {/* Atmospheric overlays for contrast and depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Floating Pill Navbar */}
      <nav className="absolute z-30 top-5 md:top-7 left-0 right-0 px-6 md:px-12 flex items-center justify-between gap-4">
        {/* Left pill */}
        <Link
          href="/"
          className="flex items-center gap-2.5 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-full pl-4 pr-6 py-2.5 shadow-lg shadow-black/40 hover:border-white/20 transition-colors"
        >
          <svg
            viewBox="0 0 256 256"
            className="h-4 w-4 fill-white shrink-0"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
          </svg>
          <span className="text-white text-sm font-medium tracking-tight">securify</span>
        </Link>

        {/* Center pill */}
        <div className="hidden md:flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 shadow-lg shadow-black/40">
          <Link
            href="#platform"
            className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-1.5 rounded-full"
          >
            platform
          </Link>
          <Link
            href="#solutions"
            className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-1.5 rounded-full"
          >
            solutions
          </Link>
          <Link
            href="#company"
            className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-1.5 rounded-full"
          >
            company
          </Link>
          <Link
            href="#support"
            className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-1.5 rounded-full"
          >
            support
          </Link>
        </div>

        {/* Right button */}
        <Link
          href="/sign-in"
          className="bg-white text-black text-sm font-medium rounded-full px-5 py-2.5 hover:bg-neutral-200 transition-colors shadow-lg shadow-black/40 shrink-0"
        >
          get started
        </Link>
      </nav>

      {/* Foreground content wrapper */}
      <div className="relative z-10 h-full w-full pointer-events-none">
        {/* Giant staggered headline: 'protect' */}
        <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-6 md:left-12 top-[18%] md:top-[17%] leading-none drop-shadow-md">
          protect
        </h1>

        {/* Giant staggered headline: 'your' */}
        <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] right-6 md:right-12 top-[38%] md:top-[39%] leading-none drop-shadow-md">
          your
        </h1>

        {/* Giant staggered headline: 'data' */}
        <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-[14%] md:left-[24%] top-[58%] md:top-[59%] leading-none drop-shadow-md">
          data
        </h1>

        {/* Bottom smooth fade to black */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>
    </section>
  )
}
