import * as capture from "./index"

declare global {
  interface Window {
    CrikketCapture?: typeof capture
  }
}

if (typeof window !== "undefined") {
  window.CrikketCapture = capture
}
