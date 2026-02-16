"use client"

import { authClient } from "@crikket/auth/client"
import { Button } from "@crikket/ui/components/ui/button"
import { Field, FieldError, FieldLabel } from "@crikket/ui/components/ui/field"
import { Input } from "@crikket/ui/components/ui/input"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"

import { userNameFormSchema } from "@/lib/schema/settings"

interface UserSettingsNameFormProps {
  initialName: string
}

export function UserSettingsNameForm({
  initialName,
}: UserSettingsNameFormProps) {
  const router = useRouter()
  const form = useForm({
    defaultValues: {
      name: initialName,
    },
    validators: {
      onChange: userNameFormSchema,
    },
    onSubmit: async ({ value }) => {
      const nextName = value.name.trim()

      if (nextName === initialName.trim()) {
        return
      }

      const { error } = await authClient.updateUser({
        name: nextName,
      })

      if (error) {
        toast.error(error.message ?? "Failed to update name")
        return
      }

      toast.success("Name updated")
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
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                aria-invalid={isInvalid}
                autoComplete="name"
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
        {form.state.isSubmitting ? "Saving..." : "Save name"}
      </Button>
    </form>
  )
}
