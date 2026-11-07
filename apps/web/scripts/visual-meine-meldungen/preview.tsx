import { createRoot } from "react-dom/client"
import { MyReportedBugReportCard } from "../../src/app/(protected)/(dashboard)/_components/bug-reports/my-reported-bug-report-card"

const demoItems = [
  {
    id: "cds-screenshot",
    title: "CDS CoachingDokumentationsSystem",
    description: "Screenshot-Meldung aus einer anderen Organisation",
    status: "resolved" as const,
    priority: "medium" as const,
    organizationName: "CDS",
    duration: "0:00",
    thumbnail:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#0f766e"/><text x="50%" y="50%" fill="white" font-size="28" text-anchor="middle" dominant-baseline="middle">CDS Screenshot</text></svg>`
      ),
    attachmentUrl: undefined,
    attachmentType: "screenshot" as const,
    createdAt: "2026-10-22T09:00:00.000Z",
  },
  {
    id: "cds-no-media",
    title: "CDS Lead-Verwaltung | Suche",
    description: "Ticket ohne Anhang, Kachel bleibt lesbar",
    status: "resolved" as const,
    priority: "none" as const,
    organizationName: "CDS",
    duration: "0:00",
    thumbnail: undefined,
    attachmentUrl: undefined,
    attachmentType: undefined,
    createdAt: "2026-10-22T10:00:00.000Z",
  },
  {
    id: "bt-video",
    title: "Bewerbungstool",
    description: "Video-Fallback mit Dauer-Badge",
    status: "closed" as const,
    priority: "low" as const,
    organizationName: "Bewerbungstool",
    duration: "0:40",
    thumbnail:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#1e3a8a"/><text x="50%" y="50%" fill="white" font-size="28" text-anchor="middle" dominant-baseline="middle">Video-Vorschaubild</text></svg>`
      ),
    attachmentUrl: "https://example.invalid/clip.webm",
    attachmentType: "video" as const,
    createdAt: "2026-09-08T06:18:34.000Z",
  },
]

function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <section
        aria-labelledby="my-reported-heading"
        className="mx-auto max-w-6xl space-y-3"
      >
        <div>
          <h1 className="font-semibold text-xl" id="my-reported-heading">
            Meine Meldungen
          </h1>
          <p className="text-slate-600 text-sm">
            Von Ihnen eingereichte Meldungen in anderen Organisationen
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demoItems.map((item) => (
            <MyReportedBugReportCard key={item.id} report={item} />
          ))}
        </div>
      </section>
    </main>
  )
}

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(<App />)
}
