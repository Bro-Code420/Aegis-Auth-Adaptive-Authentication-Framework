import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReactNode } from "react"

interface AdminTableProps<T> {
  columns: {
    header: string
    accessor: keyof T | ((item: T) => ReactNode)
    className?: string
  }[]
  data: T[]
  emptyMessage?: string
}

export function AdminTable<T>({ columns, data, emptyMessage = "No data available" }: AdminTableProps<T>) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="border-border hover:bg-transparent">
            {columns.map((col, idx) => (
              <TableHead key={idx} className={`text-muted-foreground font-semibold ${col.className}`}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, rowIdx) => (
              <TableRow key={rowIdx} className="border-border hover:bg-muted/50 text-foreground">
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} className={col.className}>
                    {typeof col.accessor === "function" 
                      ? col.accessor(item) 
                      : (item[col.accessor] as ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
