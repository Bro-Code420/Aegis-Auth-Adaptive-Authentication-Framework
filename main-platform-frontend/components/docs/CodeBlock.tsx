"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CodeBlockProps {
    code: string
    language?: string
}

export function CodeBlock({ code, language = "bash" }: CodeBlockProps) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="group relative rounded-xl border border-border/50 bg-slate-950/50 font-mono text-sm shadow-sm">
            <div className="flex h-10 items-center justify-between border-b border-white/5 px-4">
                <span className="text-xs font-semibold text-slate-500">{language}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-500 hover:bg-white/5 hover:text-white"
                    onClick={copyToClipboard}
                >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </Button>
            </div>
            <div className="overflow-x-auto p-4 leading-relaxed text-slate-300">
                <pre><code>{code}</code></pre>
            </div>
        </div>
    )
}
