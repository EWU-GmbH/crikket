"use client"

import { Button } from "@crikket/ui/components/ui/button"
import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface CopyValueButtonProps {
  ariaLabel: string
  value: string
  variant?: "ghost" | "outline"
}

const COPIED_RESET_DELAY_MS = 2000

export function CopyValueButton({
  ariaLabel,
  value,
  variant = "ghost",
}: CopyValueButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setIsCopied(false)
    }, COPIED_RESET_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isCopied])

  return (
    <Button
      aria-label={ariaLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setIsCopied(true)
        toast.success("Copied")
      }}
      size="icon-sm"
      type="button"
      variant={variant}
    >
      {isCopied ? <Check /> : <Copy />}
    </Button>
  )
}
