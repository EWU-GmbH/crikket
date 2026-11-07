import type { HTMLAttributes, ReactNode } from "react"

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className ?? ""}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardContent({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  )
}
