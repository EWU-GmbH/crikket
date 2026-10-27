import { gunzipSync } from "node:zlib"
import { getStorageProvider } from "../storage"
import type { DebuggerEmailPayload } from "./debugger-email-format"

function looksGzipped(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
}

export async function loadDebuggerPayload(input: {
  debuggerKey?: string | null
  debuggerContentEncoding?: string | null
}): Promise<{
  payload: DebuggerEmailPayload
  jsonAttachment: Buffer
} | null> {
  if (!input.debuggerKey) {
    return null
  }

  const stored = await getStorageProvider().read(input.debuggerKey)
  if (stored.length === 0) {
    return null
  }

  const decoded =
    input.debuggerContentEncoding === "gzip" || looksGzipped(stored)
      ? gunzipSync(stored)
      : stored

  const parsed = JSON.parse(decoded.toString("utf8")) as DebuggerEmailPayload
  return {
    payload: parsed,
    jsonAttachment: Buffer.from(JSON.stringify(parsed, null, 2), "utf8"),
  }
}
