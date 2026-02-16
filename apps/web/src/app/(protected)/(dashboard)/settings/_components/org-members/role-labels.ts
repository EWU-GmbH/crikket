const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}

export function formatRoleLabel(role: string): string {
  if (ROLE_LABELS[role]) {
    return ROLE_LABELS[role]
  }

  return role
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
