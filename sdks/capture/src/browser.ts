import {
  close,
  defaultSubmitTransport,
  destroy,
  getConfig,
  init,
  isInitialized,
  mount,
  open,
  reset,
  startRecording,
  stopRecording,
  submit,
  takeScreenshot,
  unmount,
} from "./index"
import type { CaptureGlobalApi } from "./types"
import { clearLegacyStoredReporterEmail } from "./ui/utils/reporter-email"

const capture = {
  close,
  defaultSubmitTransport,
  destroy,
  getConfig,
  init,
  isInitialized,
  mount,
  open,
  reset,
  startRecording,
  stopRecording,
  submit,
  takeScreenshot,
  unmount,
} satisfies CaptureGlobalApi

declare global {
  interface Window {
    CrikketCapture?: CaptureGlobalApi
  }
}

if (typeof window !== "undefined") {
  clearLegacyStoredReporterEmail()
  window.CrikketCapture = capture
}
