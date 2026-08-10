/** @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

type ReporterFollowUpEmailTemplateProps = {
  title: string
  message: string
  shareUrl?: string
}

export function ReporterFollowUpEmailTemplate({
  title,
  message,
  shareUrl,
}: ReporterFollowUpEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Rückfrage zu Ihrer Meldung: ${title}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading style={headingStyle}>Rückfrage zu Ihrer Meldung</Heading>
            <Text style={textStyle}>
              Zu Ihrer Meldung haben wir eine Rückfrage:
            </Text>
            <Text style={titleStyle}>{title}</Text>
            <Text style={messageStyle}>{message}</Text>
            <Text style={textStyle}>
              Antworten Sie gerne direkt auf diese E-Mail — wir melden uns
              sobald wie möglich zurück.
            </Text>
            {shareUrl ? (
              <Button href={shareUrl} style={buttonStyle}>
                Meldung ansehen
              </Button>
            ) : null}
          </Section>
          <Text style={footerStyle}>
            Sie erhalten diese E-Mail, weil Sie diese Meldung über das
            Feedback-Widget eingereicht und Ihre E-Mail-Adresse angegeben
            haben.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = {
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: "0",
  padding: "24px 0",
}

const containerStyle = {
  margin: "0 auto",
  maxWidth: "560px",
  padding: "0 16px",
}

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "24px",
}

const headingStyle = {
  fontSize: "20px",
  fontWeight: "600",
  lineHeight: "28px",
  margin: "0 0 16px",
}

const textStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 12px",
}

const titleStyle = {
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "22px",
  margin: "0 0 12px",
  padding: "12px 16px",
}

const messageStyle = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
  padding: "12px 16px",
  whiteSpace: "pre-wrap" as const,
}

const buttonStyle = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "20px",
  padding: "10px 20px",
  textDecoration: "none",
}

const footerStyle = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "12px 0 0",
}
