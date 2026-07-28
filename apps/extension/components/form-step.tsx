import {
  MAX_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_EXTRA_ATTACHMENTS_PER_REPORT,
} from "@crikket/shared/constants/bug-report"
import {
  PRIORITY_OPTIONS,
  type Priority,
} from "@crikket/shared/constants/priorities"
import { Button } from "@crikket/ui/components/ui/button"
import { Field, FieldError, FieldLabel } from "@crikket/ui/components/ui/field"
import { Input } from "@crikket/ui/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crikket/ui/components/ui/select"
import { Textarea } from "@crikket/ui/components/ui/textarea"
import { useForm } from "@tanstack/react-form"
import { AlertTriangle } from "lucide-react"
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import * as z from "zod"
import type { BugReportExtraAttachmentInput } from "@/lib/bug-report-upload"

const priorityValues = Object.values(PRIORITY_OPTIONS) as [
  Priority,
  ...Priority[],
]

const formSchema = z.object({
  title: z.string().max(200, "Title must be at most 200 characters."),
  description: z
    .string()
    .max(3000, "Description must be at most 3000 characters."),
  priority: z.enum(priorityValues),
})

interface DebuggerSummary {
  actions: number
  logs: number
  networkRequests: number
}

interface PendingExtraAttachment extends BugReportExtraAttachmentInput {
  previewUrl?: string
}

interface FormStepProps {
  captureType: "video" | "screenshot"
  previewUrl: string | null
  videoDurationMs: number | null
  initialTitle: string
  isSubmitting: boolean
  submitError: string | null
  preSubmitWarnings: string[]
  debuggerSummary: DebuggerSummary
  onSubmit: (values: {
    title: string
    description: string
    priority: Priority
    extraAttachments: BugReportExtraAttachmentInput[]
  }) => void
  onCancel: () => void
}

interface FormValues {
  title: string
  description: string
  priority: Priority
}

function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function FormStep({
  captureType,
  previewUrl,
  videoDurationMs,
  initialTitle,
  isSubmitting,
  submitError,
  preSubmitWarnings,
  debuggerSummary,
  onSubmit,
  onCancel,
}: FormStepProps) {
  const defaultValues: FormValues = {
    title: initialTitle,
    description: "",
    priority: PRIORITY_OPTIONS.none,
  }
  const [extraAttachments, setExtraAttachments] = useState<
    PendingExtraAttachment[]
  >([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const screenshotInputId = useId()
  const fileInputId = useId()

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        title: value.title,
        description: value.description,
        priority: value.priority,
        extraAttachments: extraAttachments.map((attachment) => ({
          clientId: attachment.clientId,
          kind: attachment.kind,
          blob: attachment.blob,
          filename: attachment.filename,
        })),
      })
    },
  })

  const isBusy = isSubmitting || form.state.isSubmitting
  const totalCapturedEvents =
    debuggerSummary.actions +
    debuggerSummary.logs +
    debuggerSummary.networkRequests
  const isPrimingVideoDurationRef = useRef(false)

  useEffect(() => {
    if (!form.state.values.title && initialTitle) {
      form.setFieldValue("title", initialTitle)
    }
  }, [form, initialTitle])

  useEffect(() => {
    return () => {
      for (const attachment of extraAttachments) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }
    }
  }, [extraAttachments])

  const addFiles = (
    files: FileList | null,
    kind: "screenshot" | "file"
  ): void => {
    if (!files || files.length === 0) {
      return
    }

    const nextAttachments = [...extraAttachments]
    let error: string | null = null

    for (const file of Array.from(files)) {
      if (nextAttachments.length >= MAX_EXTRA_ATTACHMENTS_PER_REPORT) {
        error = `You can attach at most ${MAX_EXTRA_ATTACHMENTS_PER_REPORT} additional files.`
        break
      }

      if (file.size > MAX_EXTRA_ATTACHMENT_SIZE_BYTES) {
        error = `"${file.name}" is too large. Keep each additional file under 25 MB.`
        continue
      }

      if (kind === "screenshot" && !file.type.startsWith("image/")) {
        error = `"${file.name}" is not an image.`
        continue
      }

      nextAttachments.push({
        clientId: createClientId(),
        kind,
        blob: file,
        filename: file.name,
        previewUrl:
          kind === "screenshot" ? URL.createObjectURL(file) : undefined,
      })
    }

    setExtraAttachments(nextAttachments)
    setAttachmentError(error)
  }

  const removeAttachment = (clientId: string): void => {
    setExtraAttachments((current) => {
      const target = current.find(
        (attachment) => attachment.clientId === clientId
      )
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return current.filter((attachment) => attachment.clientId !== clientId)
    })
    setAttachmentError(null)
  }

  const handleVideoLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      const player = event.currentTarget
      if (isPrimingVideoDurationRef.current) {
        return
      }

      if (!(typeof videoDurationMs === "number" && videoDurationMs > 0)) {
        return
      }

      if (Number.isFinite(player.duration) && player.duration > 0) {
        return
      }

      const durationSeconds = videoDurationMs / 1000
      const safeSeekTargetSeconds = Math.max(0, durationSeconds - 0.001)
      if (safeSeekTargetSeconds <= 0) {
        return
      }

      isPrimingVideoDurationRef.current = true
      const originalTime = player.currentTime

      const restorePosition = () => {
        const maxDurationSeconds =
          Number.isFinite(player.duration) && player.duration > 0
            ? player.duration
            : durationSeconds
        player.currentTime = Math.min(originalTime, maxDurationSeconds)
        isPrimingVideoDurationRef.current = false
      }

      player.addEventListener("seeked", restorePosition, { once: true })

      try {
        player.currentTime = safeSeekTargetSeconds
      } catch {
        isPrimingVideoDurationRef.current = false
      }
    },
    [videoDurationMs]
  )

  return (
    <div className="space-y-6">
      {previewUrl && (
        <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
          {captureType === "video" ? (
            <div className="relative">
              <video
                className="max-h-[400px] w-full bg-black object-contain"
                controls
                onLoadedMetadata={handleVideoLoadedMetadata}
                preload="metadata"
                src={previewUrl}
              >
                <track kind="captions" />
              </video>
            </div>
          ) : (
            <img
              alt="Screenshot preview"
              className="max-h-[400px] w-full bg-black object-contain"
              src={previewUrl}
            />
          )}
        </div>
      )}

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div className="space-y-4">
          <section className="space-y-2 rounded-xl border bg-muted/20 p-4">
            <p className="font-medium text-sm">Captured debugger data</p>
            <p className="text-muted-foreground text-xs">
              {totalCapturedEvents} total events
            </p>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <span>Actions: {debuggerSummary.actions}</span>
              <span aria-hidden="true">•</span>
              <span>Logs: {debuggerSummary.logs}</span>
              <span aria-hidden="true">•</span>
              <span>Requests: {debuggerSummary.networkRequests}</span>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
            <form.Field name="title">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Title (Optional)
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Give this report a quick title"
                      value={field.state.value}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="priority">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Priority (Optional)
                    </FieldLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          field.handleChange(value as Priority)
                        }
                      }}
                      value={field.state.value}
                    >
                      <SelectTrigger
                        aria-invalid={isInvalid}
                        className="w-full"
                        id={field.name}
                      >
                        <SelectValue className="capitalize" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityValues.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {formatPriorityLabel(priority)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          </div>

          <form.Field name="description">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && field.state.meta.errors.length > 0
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Description (Optional)
                  </FieldLabel>
                  <Textarea
                    aria-invalid={isInvalid}
                    className="resize-none"
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Describe what went wrong..."
                    rows={4}
                    value={field.state.value}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <section className="space-y-3 rounded-xl border bg-muted/10 p-4">
            <div>
              <p className="font-medium text-sm">Additional attachments</p>
              <p className="text-muted-foreground text-xs">
                Add more screenshots or upload files such as logs or PDFs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm"
                htmlFor={screenshotInputId}
              >
                Add screenshot
                <input
                  accept="image/*"
                  className="sr-only"
                  disabled={isBusy}
                  id={screenshotInputId}
                  multiple
                  onChange={(event) => {
                    addFiles(event.currentTarget.files, "screenshot")
                    event.currentTarget.value = ""
                  }}
                  type="file"
                />
              </label>
              <label
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm"
                htmlFor={fileInputId}
              >
                Attach file
                <input
                  className="sr-only"
                  disabled={isBusy}
                  id={fileInputId}
                  multiple
                  onChange={(event) => {
                    addFiles(event.currentTarget.files, "file")
                    event.currentTarget.value = ""
                  }}
                  type="file"
                />
              </label>
            </div>
            {attachmentError ? (
              <p className="text-destructive text-xs">{attachmentError}</p>
            ) : null}
            {extraAttachments.length > 0 ? (
              <ul className="space-y-2">
                {extraAttachments.map((attachment) => (
                  <li
                    className="flex items-center gap-2 rounded-md border px-2 py-2"
                    key={attachment.clientId}
                  >
                    {attachment.previewUrl ? (
                      <img
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                        height={40}
                        src={attachment.previewUrl}
                        width={40}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-[10px] uppercase">
                        file
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">
                        {attachment.filename ?? attachment.kind}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {attachment.kind} · {formatBytes(attachment.blob.size)}
                      </p>
                    </div>
                    <Button
                      disabled={isBusy}
                      onClick={() => {
                        removeAttachment(attachment.clientId)
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        {preSubmitWarnings.length > 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 font-medium text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Review before submitting
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800 text-xs">
              {preSubmitWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {submitError && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-red-400 text-sm">{submitError}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            disabled={isBusy}
            onClick={() => {
              form.reset()
              onCancel()
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button className="flex-1" disabled={isBusy} type="submit">
            {isBusy ? "Submitting..." : "Submit Bug Report"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function formatPriorityLabel(priority: Priority): string {
  return priority
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
