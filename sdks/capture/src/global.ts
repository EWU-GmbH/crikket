import * as capture from "./eager"
import type { CaptureGlobalApi } from "./types"
import { clearLegacyStoredReporterEmail } from "./ui/utils/reporter-email"

declare global {
  interface Window {
    CrikketCapture?: CaptureGlobalApi
  }
}

if (typeof window !== "undefined") {
  clearLegacyStoredReporterEmail()
  window.CrikketCapture = capture
}
