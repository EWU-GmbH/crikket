import type { HTMLAttributes, ReactNode } from "react"

export function Badge({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${className ?? ""}`}
      {...rest}
    >
      {children}
    </span>
  )
}
