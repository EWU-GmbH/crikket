"use client"

import { authClient } from "@crikket/auth/client"
import { Button } from "@crikket/ui/components/ui/button"
import { Field, FieldError, FieldLabel } from "@crikket/ui/components/ui/field"
import { Input } from "@crikket/ui/components/ui/input"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"

import {
  shouldAutoSyncOrganizationSlug,
  slugifyOrganizationName,
} from "@/lib/organization"
import { organizationSettingsFormSchema } from "@/lib/schema/settings"

interface OrganizationSettingsFormProps {
  organizationId: string
  initialName: string
  initialSlug: string
}

export function OrganizationSettingsForm({
  organizationId,
  initialName,
  initialSlug,
}: OrganizationSettingsFormProps) {
  const router = useRouter()
  const form = useForm({
    defaultValues: {
      name: initialName,
      slug: initialSlug,
    },
    validators: {
      onChange: organizationSettingsFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.organization.update({
        organizationId,
        data: {
          name: value.name,
          slug: value.slug,
        },
      })

      if (error) {
        toast.error(error.message ?? "Failed to update organization")
        return
      }

      toast.success("Organization updated")
      router.refresh()
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Organization name</FieldLabel>
              <Input
                aria-invalid={isInvalid}
                autoComplete="off"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const nextName = event.target.value
                  const previousName = field.state.value
                  field.handleChange(nextName)

                  const currentSlug = form.getFieldValue("slug")

                  if (
                    shouldAutoSyncOrganizationSlug(currentSlug, previousName)
                  ) {
                    form.setFieldValue(
                      "slug",
                      slugifyOrganizationName(nextName)
                    )
                  }
                }}
                value={field.state.value}
              />
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="slug">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
              <Input
                aria-invalid={isInvalid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          )
        }}
      </form.Field>

      <Button disabled={form.state.isSubmitting} type="submit">
        {form.state.isSubmitting ? "Saving..." : "Save organization"}
      </Button>
    </form>
  )
}
