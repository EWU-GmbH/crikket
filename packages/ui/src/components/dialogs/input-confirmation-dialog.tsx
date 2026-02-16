"use client"

import { Button } from "@crikket/ui/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@crikket/ui/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@crikket/ui/components/ui/field"
import { Input } from "@crikket/ui/components/ui/input"
import * as React from "react"

interface InputConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmationValue: string
  confirmationLabel?: string
  confirmationPlaceholder?: string
  confirmationHelpText?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  isLoading?: boolean
}

function isExactMatch(value: string, expected: string): boolean {
  return value.trim() === expected.trim()
}

export function InputConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmationValue,
  confirmationLabel = "Type to confirm",
  confirmationPlaceholder,
  confirmationHelpText,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: InputConfirmationDialogProps) {
  const [inputValue, setInputValue] = React.useState("")
  const canConfirm = isExactMatch(inputValue, confirmationValue)

  React.useEffect(() => {
    if (!open) {
      setInputValue("")
    }
  }, [open])

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="confirmation-input">
            {confirmationLabel}
          </FieldLabel>
          <Input
            autoComplete="off"
            id="confirmation-input"
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={confirmationPlaceholder ?? confirmationValue}
            spellCheck={false}
            value={inputValue}
          />
          {confirmationHelpText ? (
            <FieldDescription>{confirmationHelpText}</FieldDescription>
          ) : null}
        </Field>

        <DialogFooter>
          <Button
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {cancelText}
          </Button>
          <Button
            disabled={isLoading || !canConfirm}
            onClick={handleConfirm}
            variant={variant}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
