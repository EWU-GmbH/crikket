import "@crikket/env/web"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    if (
      !host ||
      host.includes("__CRIKKET_POSTHOG_HOST__") ||
      host.includes("__crikket_posthog_host__")
    ) {
      return []
    }

    return [
      {
        source: "/ph/:path*",
        destination: `${host}/:path*`,
      },
    ]
  },
}

export default nextConfig
