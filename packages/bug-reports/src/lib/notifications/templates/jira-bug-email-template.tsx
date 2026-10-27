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

type JiraBugEmailTemplateProps = {
  title: string
  description?: string | null
  pageUrl?: string | null
  priorityLabel?: string
  reporterEmail?: string | null
  shareUrl?: string
  deviceSummary?: string | null
  captureUrl?: string | null
  actionsText?: string | null
  logsText?: string | null
  networkText?: string | null
  debuggerCounts?: {
    actions: number
    logs: number
    networkRequests: number
  } | null
}

export function JiraBugEmailTemplate({
  title,
  description,
  pageUrl,
  priorityLabel,
  reporterEmail,
  shareUrl,
  deviceSummary,
  captureUrl,
  actionsText,
  logsText,
  networkText,
  debuggerCounts,
}: JiraBugEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading style={headingStyle}>{title}</Heading>
            {description ? (
              <Text style={preStyle}>{description}</Text>
            ) : (
              <Text style={metaStyle}>Keine Beschreibung angegeben.</Text>
            )}
            <Text style={metaStyle}>
              {`Melder: ${reporterEmail?.trim() || "nicht angegeben"}`}
            </Text>
            {priorityLabel ? (
              <Text style={metaStyle}>{`Priorität: ${priorityLabel}`}</Text>
            ) : null}
            {pageUrl ? (
              <Text style={metaStyle}>
                Seite:{" "}
                <a href={pageUrl} style={linkStyle}>
                  {pageUrl}
                </a>
              </Text>
            ) : null}
            {deviceSummary ? (
              <Text style={metaStyle}>{`Gerät: ${deviceSummary}`}</Text>
            ) : null}
            {captureUrl ? (
              <Text style={metaStyle}>
                Aufnahme:{" "}
                <a href={captureUrl} style={linkStyle}>
                  {captureUrl}
                </a>
              </Text>
            ) : null}
            {debuggerCounts ? (
              <Text style={metaStyle}>
                {`Kontext: ${debuggerCounts.actions} Schritte, ${debuggerCounts.logs} Konsole, ${debuggerCounts.networkRequests} Netzwerk`}
              </Text>
            ) : null}
            {actionsText ? (
              <>
                <Heading as="h2" style={sectionHeadingStyle}>
                  Schritte
                </Heading>
                <Text style={preStyle}>{actionsText}</Text>
              </>
            ) : null}
            {logsText ? (
              <>
                <Heading as="h2" style={sectionHeadingStyle}>
                  Konsole
                </Heading>
                <Text style={preStyle}>{logsText}</Text>
              </>
            ) : null}
            {networkText ? (
              <>
                <Heading as="h2" style={sectionHeadingStyle}>
                  Netzwerk
                </Heading>
                <Text style={preStyle}>{networkText}</Text>
              </>
            ) : null}
            {shareUrl ? (
              <Button href={shareUrl} style={buttonStyle}>
                Meldung in Crikket öffnen
              </Button>
            ) : null}
          </Section>
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
  maxWidth: "640px",
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

const sectionHeadingStyle = {
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "20px",
  margin: "16px 0 8px",
}

const preStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
  whiteSpace: "pre-wrap" as const,
}

const metaStyle = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px",
}

const linkStyle = {
  color: "#0f172a",
  wordBreak: "break-all" as const,
}

const buttonStyle = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "20px",
  margin: "12px 0 0",
  padding: "10px 20px",
  textDecoration: "none",
}
