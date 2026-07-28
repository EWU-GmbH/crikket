import {
  MAX_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_EXTRA_ATTACHMENTS_PER_REPORT,
} from "@crikket/shared/constants/bug-report"
import { useEffect, useId, useRef, useState } from "react"
import type { CaptureSubmissionDraft } from "../../../types"
import type { CaptureReviewSubmitOptions, CaptureUiState } from "../../types"
import { MediaPreview } from "../components/media-preview"
import { Button } from "../components/primitives/button"
import { Field, FieldError } from "../components/primitives/field"
import { Input } from "../components/primitives/input"
import { Label } from "../components/primitives/label"
import { Textarea } from "../components/primitives/textarea"
import { ScreenshotAnnotationEditor } from "../components/screenshot-annotation-editor"
import { SummaryStat } from "../components/summary-stat"
import { useReviewForm } from "../hooks/use-review-form"
import { capturePriorityOptions } from "../utils/review-form-schema"
import {
  createAnnotatedScreenshotBlob,
  type ScreenshotAnnotation,
} from "../utils/screenshot-annotations"

interface ReviewFormSectionProps {
  formKey: string
  isSubmitting: boolean
  state: CaptureUiState
  onCancel: () => void
  onCropScreenshot: (blob: Blob) => void
  onSubmit: (
    draft: CaptureSubmissionDraft,
    options?: CaptureReviewSubmitOptions
  ) => Promise<void>
}

interface PendingExtraAttachment {
  clientId: string
  kind: "screenshot" | "file"
  blob: Blob
  filename?: string
  previewUrl?: string
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

export function ReviewFormSection({
  formKey,
  isSubmitting,
  state,
  onCancel,
  onCropScreenshot,
  onSubmit,
}: ReviewFormSectionProps): React.JSX.Element {
  const [annotations, setAnnotations] = useState<ScreenshotAnnotation[]>([])
  const [extraAttachments, setExtraAttachments] = useState<
    PendingExtraAttachment[]
  >([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const screenshotInputId = useId()
  const fileInputId = useId()
  const previousMediaObjectUrlRef = useRef(state.media?.objectUrl)

  useEffect(() => {
    if (previousMediaObjectUrlRef.current === state.media?.objectUrl) {
      return
    }

    previousMediaObjectUrlRef.current = state.media?.objectUrl
    setAnnotations([])
    setExtraAttachments((current) => {
      for (const attachment of current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }
      return []
    })
    setAttachmentError(null)
  }, [state.media?.objectUrl])

  useEffect(() => {
    return () => {
      for (const attachment of extraAttachments) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }
    }
  }, [extraAttachments])

  const form = useReviewForm({
    initialDraft: state.reviewDraft,
    onSubmit: async (draft) => {
      let submitOptions: CaptureReviewSubmitOptions = {}

      if (state.media?.captureType === "screenshot" && annotations.length > 0) {
        const screenshotBlobOverride = await createAnnotatedScreenshotBlob({
          annotations,
          imageUrl: state.media.objectUrl,
        })

        if (screenshotBlobOverride) {
          submitOptions = { screenshotBlobOverride }
        }
      }

      if (extraAttachments.length > 0) {
        submitOptions = {
          ...submitOptions,
          extraAttachments: extraAttachments.map((attachment) => ({
            clientId: attachment.clientId,
            kind: attachment.kind,
            blob: attachment.blob,
            filename: attachment.filename,
          })),
        }
      }

      onSubmit(
        draft,
        Object.keys(submitOptions).length > 0 ? submitOptions : undefined
      )
    },
  })

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
        error = `Sie können höchstens ${MAX_EXTRA_ATTACHMENTS_PER_REPORT} zusätzliche Dateien anhängen.`
        break
      }

      if (file.size > MAX_EXTRA_ATTACHMENT_SIZE_BYTES) {
        error = `"${file.name}" ist zu groß. Jede zusätzliche Datei darf maximal 25 MB groß sein.`
        continue
      }

      if (kind === "screenshot" && !file.type.startsWith("image/")) {
        error = `"${file.name}" ist kein Bild.`
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

  return (
    <section
      className="grid h-full min-h-0 gap-0 lg:grid-cols-[minmax(0,1.5fr)_360px]"
      key={formKey}
    >
      <div className="flex min-h-[320px] min-w-0 flex-col border-b bg-muted/20 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <p className="font-medium text-sm">Aufnahme prüfen</p>
            <p className="text-muted-foreground text-xs">
              {state.media?.captureType === "screenshot"
                ? "Bearbeiten Sie den Screenshot vor dem Absenden."
                : "Prüfen Sie die Aufnahme vor dem Absenden."}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {state.media?.captureType === "screenshot" ? (
            <ScreenshotAnnotationEditor
              annotations={annotations}
              disabled={state.busy || isSubmitting}
              onChange={setAnnotations}
              onCrop={onCropScreenshot}
              src={state.media.objectUrl}
            />
          ) : (
            <div className="flex min-h-full items-center justify-center">
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/70 bg-black">
                <MediaPreview media={state.media} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto p-5">
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat label="Aktionen" value={state.summary.actions} />
            <SummaryStat label="Logs" value={state.summary.logs} />
            <SummaryStat
              label="Netzwerk"
              value={state.summary.networkRequests}
            />
          </div>

          {state.warnings.length > 0 ? (
            <ul className="m-0 grid gap-1 rounded-lg border bg-muted/40 px-4 py-3 pl-8 text-muted-foreground text-xs">
              {state.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <form className="grid gap-4" onSubmit={form.handleSubmit}>
            <Field data-invalid={Boolean(form.visibleErrors.title)}>
              <Label htmlFor={`${formKey}-title`}>Titel</Label>
              <Input
                aria-invalid={Boolean(form.visibleErrors.title)}
                id={`${formKey}-title`}
                maxLength={200}
                onBlur={() => {
                  form.touchField("title")
                }}
                onChange={(event) => {
                  form.setFieldValue("title", event.currentTarget.value)
                }}
                placeholder="Titel eingeben (optional)"
                value={form.draft.title}
              />
              {form.visibleErrors.title ? (
                <FieldError errors={[form.visibleErrors.title]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(form.visibleErrors.description)}>
              <Label htmlFor={`${formKey}-description`}>Beschreibung</Label>
              <Textarea
                aria-invalid={Boolean(form.visibleErrors.description)}
                className="min-h-32 resize-y"
                id={`${formKey}-description`}
                maxLength={4000}
                onBlur={() => {
                  form.touchField("description")
                }}
                onChange={(event) => {
                  form.setFieldValue("description", event.currentTarget.value)
                }}
                placeholder="Beschreibung eingeben (optional)"
                value={form.draft.description}
              />
              {form.visibleErrors.description ? (
                <FieldError errors={[form.visibleErrors.description]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(form.visibleErrors.priority)}>
              <Label htmlFor={`${formKey}-priority`}>Priorität</Label>
              <select
                aria-invalid={Boolean(form.visibleErrors.priority)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60"
                id={`${formKey}-priority`}
                onBlur={() => {
                  form.touchField("priority")
                }}
                onChange={(event) => {
                  form.setFieldValue(
                    "priority",
                    event.currentTarget
                      .value as CaptureSubmissionDraft["priority"]
                  )
                }}
                value={form.draft.priority}
              >
                {capturePriorityOptions.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {form.visibleErrors.priority ? (
                <FieldError errors={[form.visibleErrors.priority]} />
              ) : null}
            </Field>

            <div className="grid gap-2">
              <Label>Zusätzliche Anhänge</Label>
              <p className="m-0 text-muted-foreground text-xs">
                Fügen Sie weitere Screenshots hinzu oder laden Sie Dateien wie
                Logs oder PDFs hoch.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  htmlFor={screenshotInputId}
                >
                  Screenshot hinzufügen
                  <input
                    accept="image/*"
                    className="sr-only"
                    disabled={state.busy || isSubmitting}
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
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  htmlFor={fileInputId}
                >
                  Datei anhängen
                  <input
                    className="sr-only"
                    disabled={state.busy || isSubmitting}
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
                <p className="m-0 text-destructive text-xs">
                  {attachmentError}
                </p>
              ) : null}
              {extraAttachments.length > 0 ? (
                <ul className="m-0 grid list-none gap-2 p-0">
                  {extraAttachments.map((attachment) => (
                    <li
                      className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-2"
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
                          Datei
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-xs">
                          {attachment.filename ?? attachment.kind}
                        </p>
                        <p className="m-0 text-[11px] text-muted-foreground">
                          {attachment.kind} ·{" "}
                          {formatBytes(attachment.blob.size)}
                        </p>
                      </div>
                      <Button
                        disabled={state.busy || isSubmitting}
                        onClick={() => {
                          removeAttachment(attachment.clientId)
                        }}
                        type="button"
                        variant="outline"
                      >
                        Entfernen
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full"
                disabled={state.busy || isSubmitting}
                type="submit"
              >
                Bericht absenden
              </Button>
              <Button
                className="w-full"
                disabled={state.busy || isSubmitting}
                onClick={onCancel}
                type="button"
                variant="outline"
              >
                Neu beginnen
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
