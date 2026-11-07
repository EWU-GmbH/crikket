import type { ImgHTMLAttributes } from "react"

interface NextImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean
  sizes?: string
  priority?: boolean
}

export default function Image({
  fill,
  className,
  alt,
  src,
  ...rest
}: NextImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? ""}
      className={
        fill ? `absolute inset-0 h-full w-full ${className ?? ""}` : className
      }
      src={typeof src === "string" ? src : undefined}
      {...rest}
    />
  )
}
