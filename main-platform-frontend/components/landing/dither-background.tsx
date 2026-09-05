"use client"

import Dither from "@/components/Dither"

export function DitherBackground() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden opacity-[0.25]" aria-hidden="true">
            <Dither />
        </div>
    )
}
