import { SettingsNavigation } from "./_components/settings-navigation"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 pt-4">
      <div className="space-y-1">
        <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage personal preferences and organization administration.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SettingsNavigation />
        <div className="min-w-0 max-w-[860px]">{children}</div>
      </div>
    </div>
  )
}
