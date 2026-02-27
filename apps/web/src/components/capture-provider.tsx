"use client"

import { CapturePlugin } from "@crikket/capture/react"
import { env } from "@crikket/env/web"

const TEST_CAPTURE_PUBLIC_KEY = "pk_test_apps_web_capture"

export function CaptureProvider(): React.JSX.Element {
  return (
    <CapturePlugin
      endpoint={env.NEXT_PUBLIC_SERVER_URL}
      publicKey={TEST_CAPTURE_PUBLIC_KEY}
    />
  )
}
