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

type ResolutionEmailTemplateProps = {
  kindLabel: string
  title: string
  shareUrl?: string
}

export function ResolutionEmailTemplate({
  kindLabel,
  title,
  shareUrl,
}: ResolutionEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Ihre Meldung wurde erledigt: ${title}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading style={headingStyle}>Gute Nachrichten!</Heading>
            <Text style={textStyle}>
              {`Ihre Meldung (${kindLabel}) wurde soeben erledigt:`}
            </Text>
            <Text style={titleStyle}>{title}</Text>
            <Text style={textStyle}>
              Vielen Dank für Ihr Feedback — es hilft uns, das Produkt
              weiterzuentwickeln.
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
  margin: "0 0 16px",
  padding: "12px 16px",
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
