import { BentoCard, BentoGrid } from "@crikket/ui/components/magicui/bento-grid"
import {
  Camera,
  Check,
  Clock,
  Copy,
  Filter,
  LayoutGrid,
  Link2,
  Search,
  Shield,
  Tag,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react"
import type { ReactNode } from "react"

// ---- Shared helpers ----

function MiniChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px]">
      {children}
    </span>
  )
}

function MiniStatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 font-medium text-[10px]">
      {icon}
      {label}: {value}
    </span>
  )
}

// ---- Bento backgrounds ----

function DashboardBackground() {
  const mockReports = [
    {
      title: "Login button unresponsive on mobile",
      status: "Open",
      tag: "auth",
    },
    {
      title: "Dashboard chart flickers on resize",
      status: "In Progress",
      tag: "ui",
    },
    {
      title: "Export CSV missing data rows",
      status: "Open",
      tag: "data",
    },
    {
      title: "Notification bell not clearing",
      status: "Resolved",
      tag: "ux",
    },
  ]

  return (
    <div className="mask-[linear-gradient(to_top,transparent_10%,#000_100%)] absolute inset-0 flex flex-col gap-2 overflow-hidden p-3 transition-all duration-300 ease-out group-hover:scale-105">
      <div className="space-y-2 rounded-lg border bg-card p-2">
        <div className="flex gap-2">
          <div className="flex h-7 flex-1 items-center gap-1.5 rounded border bg-background px-2">
            <Search className="size-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              Search reports…
            </span>
          </div>
          <div className="flex h-7 items-center rounded border bg-background px-2 text-[11px]">
            Sort
          </div>
          <div className="flex h-7 items-center gap-1 rounded border bg-background px-2 text-[11px]">
            <Filter className="size-3" />
            Filters
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MiniStatChip
            icon={<TriangleAlert className="size-3" />}
            label="Open"
            value={3}
          />
          <MiniStatChip
            icon={<Shield className="size-3" />}
            label="Untriaged"
            value={1}
          />
          <MiniStatChip
            icon={<Tag className="size-3" />}
            label="Total"
            value={4}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-hidden">
        {mockReports.map((report) => (
          <div
            className="overflow-hidden rounded-lg border bg-card"
            key={report.title}
          >
            <div className="flex aspect-video items-center justify-center bg-muted">
              <Video className="size-5 text-muted-foreground/50" />
            </div>
            <div className="space-y-1.5 p-2">
              <p className="line-clamp-1 font-medium text-[11px]">
                {report.title}
              </p>
              <div className="flex flex-wrap gap-1">
                <MiniChip>{report.status}</MiniChip>
                <MiniChip>
                  <Tag className="size-2.5" />
                  {report.tag}
                </MiniChip>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CaptureBackground() {
  return (
    <div className="mask-[linear-gradient(to_top,transparent_10%,#000_100%)] absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 transition-all duration-300 ease-out group-hover:scale-105">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-background shadow-sm">
        <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <div className="h-5 w-5 rounded-sm bg-destructive" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs backdrop-blur-sm">
        <Clock className="size-3 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">
          0:12
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 font-medium text-[11px] shadow-sm">
          <Video className="size-3.5 text-primary" />
          Video
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 font-medium text-[11px] text-muted-foreground">
          <Camera className="size-3.5" />
          Screenshot
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Captures screen, console logs &amp; network calls
      </p>
    </div>
  )
}

function ShareBackground() {
  return (
    <div className="mask-[linear-gradient(to_top,transparent_10%,#000_100%)] absolute inset-0 flex flex-col justify-center gap-4 p-6 transition-all duration-300 ease-out group-hover:scale-105">
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Share Bug Report</p>
          <span className="rounded-full border bg-background px-2 py-0.5 font-medium text-[10px]">
            Public
          </span>
        </div>

        <div className="flex gap-2">
          <div className="flex h-8 flex-1 items-center overflow-hidden rounded border bg-muted/50 px-2 text-[11px] text-muted-foreground">
            crikket.app/s/abc123xf
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded border bg-background">
            <Copy className="size-3.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center justify-center gap-1 rounded-lg border-2 border-primary bg-primary/5 py-1.5 font-medium text-[11px] text-primary">
            <Shield className="size-3" />
            Public
          </div>
          <div className="flex items-center justify-center gap-1 rounded-lg border py-1.5 font-medium text-[11px] text-muted-foreground">
            <Shield className="size-3" />
            Private
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {[
          "Share with your team instantly",
          "Control visibility per report",
          "No login required to view",
        ].map((item) => (
          <div className="flex items-center gap-2 text-[11px]" key={item}>
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Check className="size-2.5 text-primary" />
            </div>
            <span className="text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamBackground() {
  const members = [
    {
      name: "Alice Chen",
      email: "alice@acme.co",
      role: "Owner",
      initials: "AC",
    },
    { name: "Bob Torres", email: "bob@acme.co", role: "Admin", initials: "BT" },
    { name: "Cara Liu", email: "cara@acme.co", role: "Member", initials: "CL" },
  ]

  const roleVariant: Record<string, string> = {
    Owner: "bg-primary text-primary-foreground",
    Admin: "bg-secondary text-secondary-foreground",
    Member: "border bg-background",
  }

  return (
    <div className="mask-[linear-gradient(to_top,transparent_10%,#000_100%)] absolute inset-0 flex flex-col gap-3 overflow-hidden p-4 transition-all duration-300 ease-out group-hover:scale-105">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="font-semibold text-sm">Team Members</p>
          <div className="flex h-7 items-center gap-1 rounded-lg border bg-background px-2.5 font-medium text-[11px]">
            <Users className="size-3" />
            Invite
          </div>
        </div>
        <div className="divide-y">
          {members.map((member) => (
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              key={member.name}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-[11px]">
                {member.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[12px]">{member.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 font-medium text-[10px] ${roleVariant[member.role]}`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="mb-2 font-medium text-[11px] text-muted-foreground">
          Pending Invitations
        </p>
        <div className="flex items-center gap-3 opacity-60">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed bg-muted">
            <span className="text-[10px] text-muted-foreground">?</span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">dan@acme.co</p>
            <p className="text-[10px] text-muted-foreground/60">
              Invite expires in 6 days
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TagsBackground() {
  return (
    <div className="mask-[linear-gradient(to_top,transparent_10%,#000_100%)] absolute inset-0 flex flex-col justify-center gap-3 overflow-hidden p-4 transition-all duration-300 ease-out group-hover:scale-105">
      <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
        <p className="font-medium text-[11px] text-muted-foreground">
          Priority
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            {
              label: "Critical",
              color: "border-destructive/50 text-destructive bg-destructive/5",
            },
            {
              label: "High",
              color:
                "border-orange-400/50 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
            },
            {
              label: "Medium",
              color:
                "border-yellow-400/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
            },
            {
              label: "Low",
              color: "border-border text-muted-foreground bg-muted/50",
            },
          ].map(({ label, color }) => (
            <span
              className={`rounded-md border px-2 py-0.5 font-medium text-[11px] ${color}`}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
        <p className="font-medium text-[11px] text-muted-foreground">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {["Open", "In Progress", "Resolved", "Closed", "Won't Fix"].map(
            (s) => (
              <span
                className="rounded-md border bg-background px-2 py-0.5 text-[11px]"
                key={s}
              >
                {s}
              </span>
            )
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
        <p className="font-medium text-[11px] text-muted-foreground">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {["auth", "ui", "api", "data", "performance", "mobile", "ux"].map(
            (tag) => (
              <span
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[11px]"
                key={tag}
              >
                <Tag className="size-2.5" />
                {tag}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Feature cards config ----

const features = [
  {
    Icon: LayoutGrid,
    name: "Unified Bug Dashboard",
    description:
      "See every bug in one place. Filter by status, priority, and visibility so your team can focus fast.",
    href: "#",
    cta: "See the dashboard",
    background: <DashboardBackground />,
    className: "col-span-3 md:col-span-2",
  },
  {
    Icon: Video,
    name: "One-Click Capture",
    description:
      "Record a bug in seconds with video or screenshot. Logs and network requests are captured automatically.",
    href: "#",
    cta: "Try it now",
    background: <CaptureBackground />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: Link2,
    name: "Instant Sharing",
    description: "Share any report with one link. Set it to public or private.",
    href: "#",
    cta: "Learn more",
    background: <ShareBackground />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: Users,
    name: "Team Collaboration",
    description:
      "Invite teammates and control access by role. Keep owners, admins, and members in sync.",
    href: "#",
    cta: "Explore teams",
    background: <TeamBackground />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: Tag,
    name: "Priority & Tags",
    description:
      "Add priority, status, and tags to every bug. Keep triage simple and clear.",
    href: "#",
    cta: "Learn more",
    background: <TagsBackground />,
    className: "col-span-3 md:col-span-1",
  },
]

export function FeaturesSection() {
  return (
    <section className="w-full space-y-6 px-4 text-left sm:px-0">
      <div className="space-y-2 text-center">
        <h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
          Everything your team needs
        </h2>
        <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
          From one-click capture to team workflows. Crikket gives you a complete
          bug reporting toolkit out of the box.
        </p>
      </div>

      <BentoGrid>
        {features.map((feature) => (
          <BentoCard key={feature.name} {...feature} />
        ))}
      </BentoGrid>
    </section>
  )
}
