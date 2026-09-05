import { ScrollArea } from "@/components/ui/scroll-area"

interface LogEntry {
  timestamp: string
  message: string
  type?: "info" | "warning" | "error" | "success"
}

interface LogViewerProps {
  logs: LogEntry[]
  maxHeight?: string
}

export function LogViewer({ logs, maxHeight = "400px" }: LogViewerProps) {
  return (
    <div className="rounded-md border border-border bg-muted/50 font-mono text-xs">
      <ScrollArea style={{ height: maxHeight }}>
        <div className="p-4 space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-4">
              <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
              <span className={`
                ${log.type === "error" ? "text-rose-400" : ""}
                ${log.type === "warning" ? "text-yellow-400" : ""}
                ${log.type === "success" ? "text-emerald-400" : ""}
                ${!log.type || log.type === "info" ? "text-foreground" : ""}
              `}>
                {log.message}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-muted-foreground italic">No logs available...</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
