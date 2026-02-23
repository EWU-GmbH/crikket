import { env } from "@crikket/env/web"
import { siteConfig } from "@crikket/shared/config/site"
import { ShimmerButton } from "@crikket/ui/components/magicui/shimmer-button"
import { ArrowRight, Github } from "lucide-react"
import Link from "next/link"
import { HeroDemo } from "./hero-demo"

export function Hero() {
  return (
    <div className="flex w-full flex-col items-center space-y-16">
      <section className="fade-in slide-in-from-bottom-8 flex max-w-4xl animate-in flex-col items-center space-y-8 px-4 duration-1000 sm:px-0">
        <Link
          className="inline-flex cursor-pointer items-center rounded-full border border-border bg-background/50 px-4 py-1.5 font-medium text-muted-foreground text-sm shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-colors hover:bg-muted/50"
          href={siteConfig.links.github}
          rel="noreferrer"
          target="_blank"
        >
          <Github className="mr-2 h-4 w-4" />
          Star on GitHub
        </Link>

        <h1 className="text-balance text-center font-extrabold text-5xl tracking-tight sm:text-7xl lg:text-7xl">
          The{" "}
          <span className="bg-linear-to-br from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
            open source
          </span>{" "}
          bug reporting tool
        </h1>

        <p className="max-w-2xl text-balance text-center text-lg text-muted-foreground sm:text-xl">
          Instantly capture everything your team needs to reproduce bugs in one
          click. Stop asking "how did this happen?" and start resolving issues
          faster.
        </p>

        <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:gap-6">
          <Link href={env.NEXT_PUBLIC_APP_URL} target="_blank">
            <ShimmerButton className="h-12 px-8 shadow-2xl">
              <span className="flex items-center text-center font-semibold text-sm text-white leading-none tracking-tight">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </ShimmerButton>
          </Link>
          <Link href={env.NEXT_PUBLIC_DEMO_URL || "#"} target="_blank">
            <button className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full border border-border bg-background/50 px-8 font-medium text-sm shadow-sm backdrop-blur-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Live Demo
            </button>
          </Link>
        </div>
      </section>

      {/* Video Presentation Section */}
      <section className="fade-in slide-in-from-bottom-12 mx-auto w-full max-w-[1400px] animate-in fill-mode-both delay-200 duration-1000">
        <HeroDemo />
      </section>
    </div>
  )
}
