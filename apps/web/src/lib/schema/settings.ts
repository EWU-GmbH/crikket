import * as z from "zod"

import { organizationFormSchema } from "@/lib/schema/organization"

export const userNameFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export const userPasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const organizationSettingsFormSchema = organizationFormSchema

export const inviteMemberFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(["admin", "member"]),
})
