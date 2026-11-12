"use client"

import { Checkbox } from "@crikket/ui/components/ui/checkbox"
import { useState } from "react"
import { toast } from "sonner"

import { client } from "@/utils/orpc"

interface ReporterReceiptEmailSettingProps {
  canManage: boolean
  initialEnabled: boolean
  organizationId: string
}

export function ReporterReceiptEmailSetting({
  canManage,
  initialEnabled,
  organizationId,
}: ReporterReceiptEmailSettingProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pending, setPending] = useState(false)

  async function save(next: boolean) {
    if (!canManage || pending || next === enabled) {
      return
    }

    const previous = enabled
    setEnabled(next)
    setPending(true)

    try {
      await client.bugReport.updateReporterReceiptEmailSetting({
        enabled: next,
        organizationId,
      })
      toast.success(
        next
          ? "Bestätigungsmail ist eingeschaltet"
          : "Bestätigungsmail ist ausgeschaltet"
      )
    } catch (error) {
      setEnabled(previous)
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen"
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3">
        <Checkbox
          checked={enabled}
          disabled={!canManage || pending}
          id="reporter-receipt-email"
          onCheckedChange={(checked) => {
            save(checked === true).catch(() => undefined)
          }}
        />
        <span className="space-y-1">
          <span className="block font-medium text-sm">
            Bestätigungsmail an den Melder senden
          </span>
          <span className="block text-muted-foreground text-sm">
            Standard ist aus. Wenn die Option aktiv ist, erhält der Melder nach
            dem Absenden eine kurze E-Mail, sofern eine E-Mail-Adresse
            hinterlegt ist. Pro Meldung höchstens eine Mail.
          </span>
        </span>
      </label>
      {canManage ? null : (
        <p className="text-muted-foreground text-sm">
          Nur Admins oder Owner können diese Einstellung ändern.
        </p>
      )}
    </div>
  )
}
