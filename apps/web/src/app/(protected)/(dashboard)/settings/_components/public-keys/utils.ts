const CAPTURE_ORIGIN_SPLIT_PATTERN = /\r?\n|,/

export function parsePublicKeyOrigins(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(CAPTURE_ORIGIN_SPLIT_PATTERN)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  )
}

export function formatPublicKeyOrigins(origins: string[]): string {
  return origins.join("\n")
}
