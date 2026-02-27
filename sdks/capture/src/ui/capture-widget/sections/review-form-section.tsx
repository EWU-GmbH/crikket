import { Button } from "@crikket/ui/components/ui/button"
import { Field, FieldError, FieldLabel } from "@crikket/ui/components/ui/field"
import { Input } from "@crikket/ui/components/ui/input"
import { Textarea } from "@crikket/ui/components/ui/textarea"
import { useForm } from "@tanstack/react-form"
import type { CaptureSubmissionDraft } from "../../../types"
import type { CaptureUiState } from "../../types"
import { MediaPreview } from "../components/media-preview"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/sdk-select"
import { SummaryStat } from "../components/summary-stat"
import { usePortalContainer } from "../context/portal-container-context"
import {
  capturePriorityOptions,
  reviewFormSchema,
} from "../utils/review-form-schema"

interface ReviewFormSectionProps {
  formKey: string
  isSubmitting: boolean
  state: CaptureUiState
  onCancel: () => void
  onSubmit: (draft: CaptureSubmissionDraft) => void
}

export function ReviewFormSection({
  formKey,
  isSubmitting,
  state,
  onCancel,
  onSubmit,
}: ReviewFormSectionProps): React.JSX.Element {
  const portalContainer = usePortalContainer()
  const form = useForm({
    defaultValues: state.reviewDraft,
    validators: {
      onSubmit: reviewFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        title: value.title.trim(),
        description: value.description.trim(),
        priority: value.priority,
      })
    },
  })

  return (
    <section className="grid gap-4 p-5" key={formKey}>
      <div className="overflow-hidden rounded-xl border bg-muted/60">
        <MediaPreview media={state.media} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat label="Actions" value={state.summary.actions} />
        <SummaryStat label="Logs" value={state.summary.logs} />
        <SummaryStat label="Network" value={state.summary.networkRequests} />
      </div>

      {state.warnings.length > 0 ? (
        <ul className="m-0 grid gap-1 pl-5 text-muted-foreground text-xs">
          {state.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field name="title">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && field.state.meta.errors.length > 0

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={`${formKey}-title`}>
                  Title (Optional)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={`${formKey}-title`}
                  maxLength={200}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.currentTarget.value)
                  }}
                  placeholder="What went wrong?"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="description">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && field.state.meta.errors.length > 0

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={`${formKey}-description`}>
                  Description
                </FieldLabel>
                <Textarea
                  aria-invalid={isInvalid}
                  className="min-h-24 resize-y"
                  id={`${formKey}-description`}
                  maxLength={4000}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.currentTarget.value)
                  }}
                  placeholder="Steps to reproduce, expected behavior, and what happened."
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="priority">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && field.state.meta.errors.length > 0

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={`${formKey}-priority`}>
                  Priority
                </FieldLabel>
                <Select
                  onValueChange={(value) => {
                    if (value) {
                      field.handleChange(
                        value as CaptureSubmissionDraft["priority"]
                      )
                    }
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger
                    aria-invalid={isInvalid}
                    className="w-full"
                    id={`${formKey}-priority`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent container={portalContainer}>
                    {capturePriorityOptions.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="w-full"
            disabled={state.busy || isSubmitting || form.state.isSubmitting}
            type="submit"
          >
            Submit Report
          </Button>
          <Button
            className="w-full"
            disabled={state.busy || isSubmitting || form.state.isSubmitting}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Start Over
          </Button>
        </div>
      </form>
    </section>
  )
}
