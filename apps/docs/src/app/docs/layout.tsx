import { siteConfig } from "@crikket/shared/config/site"
import { DocsLayout } from "fumadocs-ui/layouts/docs"

import { source } from "@/lib/source"

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      githubUrl={siteConfig.links.github}
      nav={{
        title: (
          <span className="font-bold tracking-tighter sm:text-lg">
            {siteConfig.name}
          </span>
        ),
        transparentMode: "top",
      }}
      tree={source.getPageTree()}
    >
      {children}
    </DocsLayout>
  )
}
