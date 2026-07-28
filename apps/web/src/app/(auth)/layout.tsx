import { siteConfig } from "@crikket/shared/config/site"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center">
        {children}
      </div>
      <footer className="p-4 text-center text-muted-foreground text-xs">
        Crikket (AGPL-3.0), modified by EWU GmbH —{" "}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href={siteConfig.links.source}
          rel="noopener noreferrer"
          target="_blank"
        >
          Source code
        </a>
      </footer>
    </div>
  )
}
