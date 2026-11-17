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
import type { NewReportEmailContent } from "../new-report-email-content"

type NewReportEmailTemplateProps = {
  content: NewReportEmailContent
}

export function NewReportEmailTemplate({
  content,
}: NewReportEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Neue Meldung eingegangen: ${content.title}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading style={headingStyle}>Neue Meldung eingegangen</Heading>
            <Text style={textStyle}>
              {`Es ist ein neuer ${content.kindLabel} eingegangen:`}
            </Text>
            <Text style={titleStyle}>{content.title}</Text>
            {content.details.map((detail) => (
              <Text key={detail.label} style={metaStyle}>
                <span style={labelStyle}>{`${detail.label}: `}</span>
                {detail.value}
              </Text>
            ))}
            {content.description ? (
              <Section style={descriptionSectionStyle}>
                <Text style={descriptionLabelStyle}>Beschreibung</Text>
                <Text style={descriptionStyle}>{content.description.text}</Text>
                {content.description.truncationNote ? (
                  <Text style={noteStyle}>
                    {content.description.truncationNote}
                  </Text>
                ) : null}
              </Section>
            ) : null}
            {content.ticket ? (
              <Button href={content.ticket.url} style={buttonStyle}>
                {content.ticket.label}
              </Button>
            ) : null}
          </Section>
          <Text style={footerStyle}>{content.footer}</Text>
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

const metaStyle = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px",
}

const labelStyle = {
  color: "#0f172a",
  fontWeight: "600",
}

const descriptionSectionStyle = {
  margin: "16px 0 8px",
}

const descriptionLabelStyle = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.04em",
  lineHeight: "18px",
  margin: "0 0 6px",
  textTransform: "uppercase" as const,
}

const descriptionStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px",
  padding: "12px 16px",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
}

const noteStyle = {
  color: "#64748b",
  fontSize: "12px",
  fontStyle: "italic",
  lineHeight: "18px",
  margin: "0 0 8px",
}

const buttonStyle = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "20px",
  margin: "8px 0 0",
  padding: "10px 20px",
  textDecoration: "none",
}

const footerStyle = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "12px 0 0",
}
