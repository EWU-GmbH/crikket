import type { Metadata } from "next"

import { InvitationClientView } from "./_components/invitation-client-view"

export const metadata: Metadata = {
  title: "Invitation",
  description: "Respond to an organization invitation.",
}

interface InvitationPageProps {
  params: Promise<{
    invitationId: string
  }>
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { invitationId } = await params

  return <InvitationClientView invitationId={invitationId} />
}
