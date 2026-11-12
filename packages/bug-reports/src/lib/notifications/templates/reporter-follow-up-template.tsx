/** @jsxImportSource react */
import {
  BUG_REPORT_COMMENT_PURPOSE_OPTIONS,
  type BugReportCommentPurpose,
} from "@crikket/shared/constants/bug-report"
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
import type { ReporterFollowUpCopy } from "../reporter-follow-up-copy"

function messageStyleFor(purpose: BugReportCommentPurpose) {
  switch (purpose) {
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.question:
      return questionMessageStyle
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.info:
      return infoMessageStyle
    default: {
      const exhaustive: never = purpose
      return exhaustive
    }
  }
}

export function ReporterFollowUpEmailTemplate({
  copy,
}: {
  copy: ReporterFollowUpCopy
}) {
  return (
    <Html>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading style={headingStyle}>{copy.heading}</Heading>
            <Text style={textStyle}>{copy.intro}</Text>
            <Text style={titleStyle}>{copy.title}</Text>
            <Text style={messageStyleFor(copy.purpose)}>{copy.message}</Text>
            <Text style={textStyle}>{copy.closing}</Text>
            {copy.shareUrl ? (
              <Button href={copy.shareUrl} style={buttonStyle}>
                Meldung ansehen
              </Button>
            ) : null}
          </Section>
          <Text style={footerStyle}>{copy.footer}</Text>
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

const questionMessageStyle = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
  padding: "12px 16px",
  whiteSpace: "pre-wrap" as const,
}

const infoMessageStyle = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
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
