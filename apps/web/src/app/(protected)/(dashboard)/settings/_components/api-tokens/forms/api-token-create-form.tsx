"use client"

import { Button } from "@crikket/ui/components/ui/button"
import { Input } from "@crikket/ui/components/ui/input"
import { Label } from "@crikket/ui/components/ui/label"
import { useState } from "react"

interface ApiTokenCreateFormProps {
  isPending: boolean
  onSubmit: (input: { label: string }) => Promise<void>
}

export function ApiTokenCreateForm({
  isPending,
  onSubmit,
}: ApiTokenCreateFormProps) {
  const [label, setLabel] = useState("")

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSubmit({ label })
        setLabel("")
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="api-token-label">Label</Label>
        <Input
          id="api-token-label"
          maxLength={80}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Cursor MCP"
          required
          value={label}
        />
        <p className="text-muted-foreground text-xs">
          Use a clear label so you know where this token is used.
        </p>
      </div>
      <Button disabled={isPending || label.trim().length === 0} type="submit">
        {isPending ? "Creating..." : "Create token"}
      </Button>
    </form>
  )
}
