/** @jsxImportSource react */
import { Button, Heading, Text } from "@react-email/components"
import { AuthEmailLayout } from "./auth-email-layout"

type OrganizationInvitationTemplateProps = {
  organizationName: string
  inviterName: string
  role: string
  invitationUrl: string
}

export function OrganizationInvitationTemplate({
  organizationName,
  inviterName,
  role,
  invitationUrl,
}: OrganizationInvitationTemplateProps) {
  return (
    <AuthEmailLayout
      previewText={`You're invited to join ${organizationName}.`}
    >
      <Heading style={headingStyle}>Organization invitation</Heading>
      <Text style={descriptionStyle}>
        {inviterName} invited you to join <strong>{organizationName}</strong> as{" "}
        <strong>{role}</strong>.
      </Text>
      <Button href={invitationUrl} style={buttonStyle}>
        Review invitation
      </Button>
      <Text style={helpTextStyle}>
        If you do not want to join this organization, you can ignore this email.
      </Text>
    </AuthEmailLayout>
  )
}

const headingStyle = {
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.01em",
  lineHeight: "32px",
  margin: "0 0 8px",
}

const descriptionStyle = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 20px",
}

const buttonStyle = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  padding: "10px 16px",
  textDecoration: "none",
}

const helpTextStyle = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "16px 0 0",
}
