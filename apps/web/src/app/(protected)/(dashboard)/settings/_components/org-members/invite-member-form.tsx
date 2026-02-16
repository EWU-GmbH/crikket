"use client"

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
import { useForm } from "@tanstack/react-form"

import { inviteMemberFormSchema } from "@/lib/schema/settings"
import { formatRoleLabel } from "./role-labels"

interface InviteMemberFormProps {
  canInviteMembers: boolean
  isInviting: boolean
  onInviteMember: (input: {
    email: string
    role: "admin" | "member"
  }) => Promise<void>
}

export function InviteMemberForm({
  canInviteMembers,
  isInviting,
  onInviteMember,
}: InviteMemberFormProps) {
  const form = useForm({
    defaultValues: {
      email: "",
      role: "member" as "admin" | "member",
    },
    validators: {
      onChange: inviteMemberFormSchema,
    },
    onSubmit: async ({ value }) => {
      await onInviteMember({
        email: value.email,
        role: value.role,
      })
      form.reset()
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_160px]">
        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && field.state.meta.errors.length > 0

            return (
              <Field className="space-y-1" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  disabled={!canInviteMembers || isInviting}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="teammate@example.com"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <Field className="space-y-1">
              <FieldLabel htmlFor={field.name}>Role</FieldLabel>
              <Select
                disabled={!canInviteMembers || isInviting}
                onValueChange={(value) =>
                  field.handleChange(value as "admin" | "member")
                }
                value={field.state.value}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue>
                    {formatRoleLabel(field.state.value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>

      <Button
        className="w-fit"
        disabled={!canInviteMembers || isInviting || form.state.isSubmitting}
        type="submit"
      >
        {isInviting || form.state.isSubmitting ? "Inviting..." : "Send invite"}
      </Button>
    </form>
  )
}
