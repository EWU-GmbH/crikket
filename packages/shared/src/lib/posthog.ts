import posthog from "posthog-js"

type PostHogClientConfig = {
  key?: string
  host?: string
}

const isPlaceholder = (v: string) =>
  v.includes("__CRIKKET_POSTHOG_") || v.includes("__crikket_posthog_")

export const initPostHog = ({ key, host }: PostHogClientConfig): void => {
  if (key && host && !isPlaceholder(key) && !isPlaceholder(host)) {
    posthog.init(key, {
      api_host: "/ph",
      ui_host: host,
      defaults: "2026-01-30",
    })
  }
}
